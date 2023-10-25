// query.mjs
import axios from "axios";
import { getTermTranslation } from "./utils.mjs";
import { createCsvWriter } from "./csvWriter.mjs";
import { parseJobList } from "./htmlParser.mjs";

class Query {
  constructor(queryObj) {
    Object.assign(
      this,
      {
        host: "www.linkedin.com",
        keyword: "",
        location: "",
        dateSincePosted: "",
        jobType: "",
        remoteFilter: "",
        salary: "",
        experienceLevel: "",
        sortBy: "",
        limit: 0,
      },
      queryObj,
    );
  }

  getTranslatedTerm(termType) {
    return getTermTranslation(termType, this[termType]);
  }

  url(start) {
    let query = `https://${this.host}/jobs-guest/jobs/api/seeMoreJobPostings/search?`;
    if (this.keyword !== "") query += `keywords=${this.keyword}`;
    if (this.location !== "") query += `&location=${this.location}`;
    if (this.getTermTranslation() !== "")
      query += `&f_TPR=${this.getTermTranslation()}`;
    if (this.getSalary() !== "") query += `&f_SB2=${this.getSalary()}`;
    if (this.getExperienceLevel() !== "")
      query += `&f_E=${this.getExperienceLevel()}`;
    if (this.getRemoteFilter() !== "")
      query += `&f_WT=${this.getRemoteFilter()}`;
    if (this.getJobType() !== "") query += `&f_JT=${this.getJobType()}`;
    query += `&start=${start}`;
    if (this.sortBy == "recent" || this.sortBy == "relevant") {
      let sortMethod = "R";
      if (this.sortBy == "recent") sortMethod = "DD";
      query += `&sortBy=${sortMethod}`;
    }
    return encodeURI(query);
  }

  async getJobs() {
    try {
      let start = 0;
      const allJobs = [];
      const csvWriter = createCsvWriter("jobs.csv");

      let hasMoreJobs = true;
      do {
        if (this.limit > 0 && allJobs.length >= this.limit) break;

        const { data } = await axios.get(this.url(start));
        const parsedJobs = parseJobList(data);

        if (parsedJobs.length === 0) {
          hasMoreJobs = false;
        } else {
          const remainingLimit =
            this.limit > 0 ? this.limit - allJobs.length : Infinity;
          const jobsToPush = parsedJobs.slice(0, remainingLimit);
          allJobs.push(...jobsToPush);
          await csvWriter.writeJobs(jobsToPush);

          start += 25;
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      } while (hasMoreJobs);

      return allJobs;
    } catch (error) {
      console.error(error);
    }
  }
}

export async function query(queryObject) {
  const queryInstance = new Query(queryObject);
  return queryInstance.getJobs();
}
