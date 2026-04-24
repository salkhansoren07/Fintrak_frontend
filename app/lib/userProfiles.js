const ID_COLUMNS = ["user_sub", "user_id"];
const REFRESH_TOKEN_COLUMNS = [
  "gmail_refresh_token",
  "google_refresh_token",
  "refresh_token",
];

function isMissingColumn(error, columnName) {
  const message = typeof error?.message === "string" ? error.message : "";
  const parts = String(columnName).split(".");
  const columnOnly = parts[parts.length - 1];
  const tableOnly = parts.length > 1 ? parts[parts.length - 2] : "";

  return (
    (error?.code === "42703" || error?.code === "PGRST204") &&
    Boolean(message) &&
    (
      message.includes(columnName) ||
      message.includes(`'${columnOnly}'`) ||
      (message.includes(columnOnly) &&
        (!tableOnly || message.includes(`'${tableOnly}'`) || message.includes(tableOnly)))
    )
  );
}

async function readByIdColumn(supabase, userSub, selectColumns) {
  let lastError = null;

  for (const idColumn of ID_COLUMNS) {
    const result = await supabase
      .from("user_profiles")
      .select(selectColumns)
      .eq(idColumn, userSub)
      .maybeSingle();

    if (isMissingColumn(result.error, `user_profiles.${idColumn}`)) {
      lastError = result.error;
      continue;
    }

    return { ...result, idColumn };
  }

  return { data: null, error: lastError, idColumn: null };
}

export async function readUserCategoryProfile(supabase, userSub) {
  return readByIdColumn(supabase, userSub, "category_overrides");
}

export async function upsertUserCategoryProfile(
  supabase,
  { userSub, email, categoryOverrides }
) {
  let lastError = null;

  for (const idColumn of ID_COLUMNS) {
    const payload = {
      [idColumn]: userSub,
      email: email || null,
      category_overrides: categoryOverrides,
    };

    const result = await supabase.from("user_profiles").upsert(payload, {
      onConflict: idColumn,
    });

    if (isMissingColumn(result.error, `user_profiles.${idColumn}`)) {
      lastError = result.error;
      continue;
    }

    return { ...result, idColumn };
  }

  return { error: lastError, idColumn: null };
}

export async function readStoredRefreshTokenProfile(supabase, userSub) {
  let lastError = null;

  for (const tokenColumn of REFRESH_TOKEN_COLUMNS) {
    const result = await readByIdColumn(
      supabase,
      userSub,
      `${tokenColumn}, email`
    );

    if (isMissingColumn(result.error, `user_profiles.${tokenColumn}`)) {
      lastError = result.error;
      continue;
    }

    return {
      data: result.data
        ? {
            email: result.data.email || null,
            refreshToken: result.data[tokenColumn] || null,
          }
        : null,
      error: result.error,
      idColumn: result.idColumn,
      tokenColumn,
    };
  }

  return { data: null, error: lastError, idColumn: null, tokenColumn: null };
}

export async function upsertStoredRefreshTokenProfile(
  supabase,
  { userSub, email, encryptedRefreshToken }
) {
  let lastError = null;

  for (const idColumn of ID_COLUMNS) {
    for (const tokenColumn of REFRESH_TOKEN_COLUMNS) {
      const payload = {
        [idColumn]: userSub,
        email: email || null,
        [tokenColumn]: encryptedRefreshToken,
      };

      const result = await supabase.from("user_profiles").upsert(payload, {
        onConflict: idColumn,
      });

      if (isMissingColumn(result.error, `user_profiles.${idColumn}`)) {
        lastError = result.error;
        break;
      }

      if (isMissingColumn(result.error, `user_profiles.${tokenColumn}`)) {
        lastError = result.error;
        continue;
      }

      return { ...result, idColumn, tokenColumn };
    }
  }

  return { error: lastError, idColumn: null, tokenColumn: null };
}

export async function clearStoredRefreshTokenProfile(supabase, userSub) {
  let lastError = null;

  for (const idColumn of ID_COLUMNS) {
    for (const tokenColumn of REFRESH_TOKEN_COLUMNS) {
      const result = await supabase
        .from("user_profiles")
        .update({ [tokenColumn]: null })
        .eq(idColumn, userSub);

      if (isMissingColumn(result.error, `user_profiles.${idColumn}`)) {
        lastError = result.error;
        break;
      }

      if (isMissingColumn(result.error, `user_profiles.${tokenColumn}`)) {
        lastError = result.error;
        continue;
      }

      return { ...result, idColumn, tokenColumn };
    }
  }

  return { error: lastError, idColumn: null, tokenColumn: null };
}
