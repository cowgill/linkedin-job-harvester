import { query } from "./main.mjs";

const jobQuery = {
  keyword: "Director of Marketing Operations",
  location: "United States",
  dateSincePosted: "past month",
  remoteFilter: "remote",
  experienceLevel: "director",
  jobType: "full time",
  limit: 100,
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


// Director Of Marketing Operations