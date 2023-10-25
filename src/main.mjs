import axios from 'axios'
import { JSDOM } from 'jsdom'
import fastCsv from 'fast-csv'
import fs from 'fs'

class Query {
  constructor(queryObj) {
    Object.assign(this, {
      host: 'www.linkedin.com',
      keyword: '',
      location: '',
      dateSincePosted: '',
      jobType: '',
      remoteFilter: '',
      salary: '',
      experienceLevel: '',
      sortBy: '',
      limit: 0,
    }, queryObj)
  }

  // Utility functions to translate human-readable query terms into URL parameters
  getDateSincePosted() { 
    const dateRange = {
      "past month": "r2592000",
      "past week": "r604800",
      "24hr": "r86400",
    };
    return dateRange[this.dateSincePosted.toLowerCase()] ?? "";
  }
  
  getExperienceLevel() {
    const experienceRange = {
      internship: "1",
      "entry level": "2",
      associate: "3",
      senior: "4",
      director: "5",
      executive: "6",
    };
    return experienceRange[this.experienceLevel.toLowerCase()] ?? "";
  }
  
  getJobType() {
    const jobTypeRange = {
      "full time": "F",
      "full-time": "F",
      "part time": "P",
      "part-time": "P",
      contract: "C",
      temporary: "T",
      volunteer: "V",
      internship: "I",
    };
    return jobTypeRange[this.jobType.toLowerCase()] ?? "";
  }
  
  getRemoteFilter() {
    const remoteFilterRange = {
      "on-site": "1",
      "on site": "1",
      remote: "2",
      hybrid: "3",
    };
    return remoteFilterRange[this.remoteFilter.toLowerCase()] ?? "";
  }
  
  getSalary() {
    const salaryRange = {
      40000: "1",
      60000: "2",
      80000: "3",
      100000: "4",
      120000: "5",
    };
    return salaryRange[this.salary.toLowerCase()] ?? "";
  }

  // Build the query URL
  url(start) { 
    let query = `https://${this.host}/jobs-guest/jobs/api/seeMoreJobPostings/search?`;
    if (this.keyword !== "") query += `keywords=${this.keyword}`;
    if (this.location !== "") query += `&location=${this.location}`;
    if (this.getDateSincePosted() !== "")
      query += `&f_TPR=${this.getDateSincePosted()}`;
    if (this.getSalary() !== "") query += `&f_SB2=${this.getSalary()}`;
    if (this.getExperienceLevel() !== "")
      query += `&f_E=${this.getExperienceLevel()}`;
    if (this.getRemoteFilter() !== "") query += `&f_WT=${this.getRemoteFilter()}`;
    if (this.getJobType() !== "") query += `&f_JT=${this.getJobType()}`;
    query += `&start=${start}`;
    if (this.sortBy == "recent" || this.sortBy == "relevant") {
      let sortMethod = "R";
      if (this.sortBy == "recent") sortMethod = "DD";
      query += `&sortBy=${sortMethod}`;
    }
    return encodeURI(query);
  }

  // Fetch job listings from LinkedIn and parse the HTML into job objects
  async getJobs() { 
    try {
      let start = 0;
      const allJobs = [];
      const fileExists = fs.existsSync('jobs.csv');  // Check if the file exists
      const writableStream = fs.createWriteStream('jobs.csv', { flags: 'a' });  // Set the flag to 'a' to append data
      const csvStream = fastCsv.format({ headers: !fileExists });  // Only include headers if the file doesn't exist
  
      csvStream.pipe(writableStream);  // Pipe the CSV stream to the writable stream
  
      let hasMoreJobs = true;  // Control variable for the loop
      do {
        // Break the loop if the limit is reached
        if (this.limit > 0 && allJobs.length >= this.limit) break;
        
        const { data } = await axios.get(this.url(start));
        const parsedJobs = parseJobList(data);
  
        if (parsedJobs.length === 0) {
          hasMoreJobs = false;  // Set hasMoreJobs to false if no jobs are returned
        } else {
          // If there's a limit, only push and write jobs up to that limit
          if (this.limit > 0 && allJobs.length + parsedJobs.length > this.limit) {
            const jobsToPush = parsedJobs.slice(0, this.limit - allJobs.length);
            allJobs.push(...jobsToPush);
            jobsToPush.forEach(job => csvStream.write(job));  // Write to CSV
          } else {
            allJobs.push(...parsedJobs);
            parsedJobs.forEach(job => csvStream.write(job));  // Write to CSV
          }
          
          start += 25;
          await new Promise(resolve => setTimeout(resolve, 1000));  // Delay next request by 1 second
        }
      } while (hasMoreJobs);  // Continue the loop as long as there are more jobs to fetch
  
      csvStream.end();  // End the CSV stream
      return allJobs;
    } catch (error) {
      console.error(error);
    }
  }
  
}

/**
 * Parse the HTML returned from LinkedIn into an array of job objects.
 * @param {string} jobData - The HTML string.
 * @returns {Array} An array of job objects.
 */
function parseJobList(jobData) {
  const { document } = new JSDOM(jobData).window
  const jobs = Array.from(document.querySelectorAll('li'))
  return jobs.map(job => {
    const position = job.querySelector('.base-search-card__title')?.textContent.trim() || ''
    const company = job.querySelector('.base-search-card__subtitle')?.textContent.trim() || ''
    const location = job.querySelector('.job-search-card__location')?.textContent.trim() || ''
    const date = job.querySelector('time')?.getAttribute('datetime') || ''
    const salary = (job.querySelector('.job-search-card__salary-info')?.textContent.trim().replace(/\n/g, '').replaceAll(' ', '')) || ''
    const jobUrl = job.querySelector('.base-card__full-link')?.getAttribute('href') || ''
    return { position, company, location, date, salary, jobUrl }
  })
}

/**
 * Initiate a job query based on the provided query object.
 * @param {Object} queryObject - The job query parameters.
 * @returns {Promise<Array>} A promise that resolves to an array of job objects.
 */
export async function query(queryObject) {
  const queryInstance = new Query(queryObject)
  console.log(queryInstance.url(0))
  return queryInstance.getJobs()
}
