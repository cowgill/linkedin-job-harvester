import axios from 'axios'
import { JSDOM } from 'jsdom'
import fastCsv from 'fast-csv'
import fs from 'fs'

// Helper function to read job IDs from a file into a set
function readJobIds(filePath) {
  return new Set(fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf-8').split('\n') : []);
}

// Helper function to write job IDs from a set to a file
function writeJobIds(filePath, jobIds) {
  fs.writeFileSync(filePath, Array.from(jobIds).join('\n'));
}


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
    // Fetch job listings from LinkedIn and parse the HTML into job objects
    async getJobs() {
      try {
        let start = 0;
        const allJobs = [];
        const fileExists = fs.existsSync('jobs.csv');
        const writableStream = fs.createWriteStream('jobs.csv', { flags: 'a' });
        const csvStream = fastCsv.format({ headers: !fileExists });
    
        // Read existing job IDs from a file into a set
        const existingJobIds = readJobIds('existing-job-ids.txt');
    
        csvStream.pipe(writableStream);
    
        let hasMoreJobs = true;
        let newJobsAdded = 0;  // Variable to keep track of the number of new jobs added
        do {
          if (this.limit > 0 && allJobs.length >= this.limit) {
            // If limit is reached or exceeded, break out of the loop
            break;
          }
    
          const { data } = await axios.get(this.url(start));
          const parsedJobs = parseJobList(data);
    
          // Filter out any jobs whose jobId is already in the set
          const newJobs = parsedJobs.filter(job => !existingJobIds.has(job.jobId));
    
          // Add the jobId of any new jobs to the set
          newJobs.forEach(job => existingJobIds.add(job.jobId));
    
          if (newJobs.length === 0 && parsedJobs.length !== 0) {
            console.log("Skipping duplicate jobs...");
            start += 25;
          } else if (newJobs.length > 0) {
            // Check if adding all new jobs would exceed the limit
            const excess = (allJobs.length + newJobs.length) - this.limit;
            const jobsToAdd = excess > 0 ? newJobs.slice(0, -excess) : newJobs;
            
            allJobs.push(...jobsToAdd);
            jobsToAdd.forEach(job => csvStream.write(job));
            newJobsAdded += jobsToAdd.length;  // Increment the newJobsAdded variable
            
            console.log(`Adding ${jobsToAdd.length} new jobs...`);
            start += 25;
          } else {
            hasMoreJobs = false;
          }
    
          await new Promise(resolve => setTimeout(resolve, 3000));
        } while (hasMoreJobs);
    
        // Write the updated set of job IDs back to the file
        writeJobIds('existing-job-ids.txt', existingJobIds);
    
        csvStream.end();
        console.log(`Total new jobs added: ${newJobsAdded}`);
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
  const { document } = new JSDOM(jobData).window;
  const jobs = Array.from(document.querySelectorAll('li'));
  return jobs.map(job => {
    const divElement = job.querySelector('div.base-card');
    const entityUrn = divElement ? divElement.getAttribute('data-entity-urn') : '';
    const jobId = entityUrn.split(':').pop();
    const position = job.querySelector('.base-search-card__title')?.textContent.trim() || '';
    const company = job.querySelector('.base-search-card__subtitle')?.textContent.trim() || '';
    const location = job.querySelector('.job-search-card__location')?.textContent.trim() || '';
    const date = job.querySelector('time')?.getAttribute('datetime') || '';
    const salary = (job.querySelector('.job-search-card__salary-info')?.textContent.trim().replace(/\n/g, '').replaceAll(' ', '')) || '';
    let jobUrl = job.querySelector('.base-card__full-link')?.getAttribute('href') || '';
    jobUrl = jobUrl.split('?refId')[0];  // Truncate the URL at ?refId
    return { jobId, position, company, location, date, salary, jobUrl };
  });
}




/**
 * Initiate a job query based on the provided query object.
 * @param {Object} queryObject - The job query parameters.
 * @returns {Promise<Array>} A promise that resolves to an array of job objects.
 */
export async function query(queryObject) {
  const queryInstance = new Query(queryObject)
  //console.log(queryInstance.url(0))
  console.log('Fetching jobs...')
  return queryInstance.getJobs()
}
