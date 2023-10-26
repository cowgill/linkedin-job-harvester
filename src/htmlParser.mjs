// htmlParser.mjs
import { JSDOM } from "jsdom";

/**
 * Parse the HTML returned from LinkedIn into an array of job objects.
 * @param {string} jobData - The HTML string.
 * @returns {Array} An array of job objects.
 */
/**
 * Parse the HTML returned from LinkedIn into an array of job objects.
 * @param {string} jobData - The HTML string.
 * @returns {Array} An array of job objects.
 */
export function parseJobList(jobData) {
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
    const jobUrl = job.querySelector('.base-card__full-link')?.getAttribute('href') || '';
    return { jobId, position, company, location, date, salary, jobUrl };
  });
}
