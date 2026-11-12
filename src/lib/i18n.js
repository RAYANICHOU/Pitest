export function t(language, english, french) {
  return language === "fr" ? french : english;
}

export function categoryLabel(language, category) {
  if (language !== "fr") {
    return {
      Anglais: "English",
      Maths: "Maths",
      Physique: "Physics",
      Mécanique: "Mechanical Reasoning",
    }[category] || category;
  }
  return category;
}

export function locale(language) {
  return language === "fr" ? "fr-FR" : "en-GB";
}
