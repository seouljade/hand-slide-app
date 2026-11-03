// deploy/headers.ts 의 값으로 vercel.json 을 만듭니다.
import { writeFileSync } from "node:fs";
import { renderVercelConfig } from "../deploy/headers.ts";

writeFileSync("vercel.json", renderVercelConfig());
console.log("vercel.json 을 갱신했습니다.");
