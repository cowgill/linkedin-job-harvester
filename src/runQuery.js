import { query } from "./main.mjs";

const jobQuery = {
  keyword: "Marketing Operations",
  location: "United States",
  dateSincePosted: "past week",
  remoteFilter: "remote",
  experienceLevel: "director",
  jobType: "full time",
  limit: 20,
};

query(jobQuery);

// const queryOptions = {
//   keyword: "HR",
//   location: "San Francisco Bay Area",
//   dateSincePosted: "past Week",
//   jobType: "full time",
//   remoteFilter: "remote",
//   salary: "100000",
//   experienceLevel: "entry level",
//   limit: "1",
//   sortBy: "recent",
// };

// linkedIn.query(queryOptions).then((response) => {
//   console.log(response); // An array of Job objects
// });
