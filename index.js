const core = require("@actions/core");
const github = require("@actions/github");
import { Context } from "@actions/github/lib/context";

try {
  // `who-to-greet` input defined in action metadata file
  const nameToGreet = core.getInput("who-to-greet");
  console.log(`Hello ${nameToGreet}!`);
  const time = new Date().toTimeString();
  core.setOutput("time", time);
  // Get the JSON webhook payload for the event that triggered the workflow
  const context = new Context();
  const mergedInto = context?.payload?.pull_request?.base.ref;
  const repository= context?.payload?.pull_request?.repository;
  const labels= repository.labels;
  
  const payload = {
    context,
    labels
  };
  console.log(`The event payload: ${JSON.stringify(payload, null, 2)}`);

  // Pull labels
  let patchRelease = {};

  
  for (label of labels) {
    if (label?.name.includes("patch:")) {
      const patchBranch = label.name.split("patch:")[1];
      if (!patchRelease[patchBranch]) {
        patchRelease[patchBranch] = [];
      }
      patchRelease[patchBranch].push(pull);
    }
  }

  for await (const releaseName of Object.keys(patchRelease)) {
    for await (const release of patchRelease[releaseName]) {
      try {
        const dataSet = {
          owner: repository.owner.login,
          repo: repository.name,
          releaseName,
          mergedBranch: release.head.ref,
          ref: `refs/heads/${mergedInto}`,
          sha: release.merge_commit_sha,
          title: `Cherry pick: ${release.title}`,
        };
        const mergeRef = "refs/heads/test-" + new Date().getTime();

        await octokit.rest.git.createRef({
          owner: dataSet.owner,
          repo: dataSet.repo,
          ref: mergeRef,
          sha: dataSet.sha,
        });

        await octokit.rest.pulls.create({
          owner: dataSet.owner,
          repo: dataSet.repo,
          title: dataSet.title,
          head: mergeRef,
          base: dataSet.releaseName,
        });
      } catch (error) {
        console.log("pull request failed", error.message);
      }
    }
  }
} catch (error) {
  core.setFailed(error.message);
}
