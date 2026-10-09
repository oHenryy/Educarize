import os from "os";
import path from "path";

const root = path.join(os.tmpdir(), "educarize-tests");

export const testPaths = {
  root,
  database: path.join(root, "test.db").replace(/\\/g, "/"),
  certificates: path.join(root, "certificates"),
};
