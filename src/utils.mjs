// utils.mjs
export const translateTerms = {
  dateSincePosted: {
    "past month": "r2592000",
    "past week": "r604800",
    "24hr": "r86400",
  },
  experienceLevel: {
    internship: "1",
    "entry level": "2",
    associate: "3",
    senior: "4",
    director: "5",
    executive: "6",
  },
  jobType: {
    "full time": "F",
    "full-time": "F",
    "part time": "P",
    "part-time": "P",
    contract: "C",
    temporary: "T",
    volunteer: "V",
    internship: "I",
  },
  remoteFilter: {
    "on-site": "1",
    "on site": "1",
    remote: "2",
    hybrid: "3",
  },
  salary: {
    40000: "1",
    60000: "2",
    80000: "3",
    100000: "4",
    120000: "5",
  },
};

export function getTermTranslation(termType, term) {
  return translateTerms[termType][term.toLowerCase()] ?? "";
}
