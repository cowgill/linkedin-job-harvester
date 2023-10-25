// csvWriter.mjs
import fastCsv from "fast-csv";
import fs from "fs";

export function createCsvWriter(filePath) {
  const fileExists = fs.existsSync(filePath);
  const writableStream = fs.createWriteStream(filePath, { flags: "a" });
  const csvStream = fastCsv.format({ headers: !fileExists });
  csvStream.pipe(writableStream);
  return {
    write: (data) => csvStream.write(data),
    end: () => csvStream.end(),
  };
}
