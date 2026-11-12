const API_BASE = "https://api.github.com";

function localized(language, english, french) {
  return language === "fr" ? french : english;
}

function encodeBase64(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

async function readError(response, language) {
  let message = "";
  try {
    const body = await response.json();
    message = typeof body.message === "string" ? body.message : "";
  } catch {
    message = "";
  }
  if (response.status === 401) return localized(language, "GitHub rejected the token. Check it and its expiration.", "GitHub a refusé le jeton. Vérifiez sa validité et sa date d'expiration.");
  if (response.status === 403) return localized(language, "GitHub denied access. Verify the token has Contents: Read and write for this repository.", "GitHub a refusé l'accès. Vérifiez que le jeton possède la permission Contents: Read and write pour ce dépôt.");
  if (response.status === 404) return localized(language, "GitHub could not find the repository or file. Verify the configured destination and token access.", "GitHub ne trouve pas le dépôt ou le fichier. Vérifiez la destination et les accès du jeton.");
  return message || localized(language, `GitHub request failed (HTTP ${response.status}).`, `La requête GitHub a échoué (HTTP ${response.status}).`);
}

export async function syncStudyBankToGitHub({
  token,
  language,
  owner,
  repository,
  path,
  branch,
  items,
}) {
  if (!token.trim()) throw new Error(localized(language, "Enter a GitHub token before syncing.", "Saisissez un jeton GitHub avant de synchroniser."));
  if (!Array.isArray(items)) throw new Error(localized(language, "The study bank is not a valid list.", "La banque de révision n'est pas une liste valide."));

  const encodedPath = path.split("/").map(encodeURIComponent).join("/");
  const endpoint = `${API_BASE}/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repository)}/contents/${encodedPath}`;
  const headers = {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token.trim()}`,
    "X-GitHub-Api-Version": "2022-11-28",
  };
  const currentResponse = await fetch(`${endpoint}?ref=${encodeURIComponent(branch)}`, { headers });
  let sha;
  if (currentResponse.ok) {
    const currentFile = await currentResponse.json();
    if (typeof currentFile.sha !== "string") {
      throw new Error(localized(language, "The configured GitHub path is not a file.", "Le chemin GitHub configuré ne désigne pas un fichier."));
    }
    sha = currentFile.sha;
  } else if (currentResponse.status !== 404) {
    throw new Error(await readError(currentResponse, language));
  }

  const bank = items
    .filter((item) => item && (item.type === "qcm" || item.type === "flashcard"))
    .map(({ id, category, type, question, options, answer, explanation }) => ({
      id,
      category,
      type,
      question,
      options: Array.isArray(options) ? options : [],
      answer,
      explanation: explanation || "",
    }));
  const content = JSON.stringify(bank, null, 2);
  const body = {
    message: "Sync Pilot Prep study bank",
    content: encodeBase64(content),
    branch,
    ...(sha ? { sha } : {}),
  };
  const response = await fetch(endpoint, {
    method: "PUT",
    headers: { ...headers, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(await readError(response, language));

  const result = await response.json();
  return {
    count: bank.length,
    commitUrl: result.commit?.html_url || null,
  };
}
