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
  const repository = context?.payload?.repository;
  const labels = context?.payload?.pull_request.labels;
  const pull_request = context?.payload?.pull_request;

  // const payload = {
  //   context,
  //   labels,
  // };
  // console.log(`The event payload: ${JSON.stringify(payload, null, 2)}`);
  
  const octokit = new github.getOctokit(core.getInput('repo_token', {required: true}))
  // Pull labels
  let patchRelease = {};
  for await (let label of labels) {
    if (label?.name.includes("patch:")) {
      const patchBranch = label.name.split("patch:")[1];

      try {
        const dataSet = {
          owner: repository.owner.login,
          repo: repository.name,
          releaseName: patchBranch,
          ref: `refs/heads/${mergedInto}`,
          sha: pull_request.merge_commit_sha,
          title: `Cherry pick: ${pull_request.title}`,
        };
        console.log("dataSet -> ", JSON.stringify(dataSet, null, 2))
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

  for await (const releaseName of Object.keys(patchRelease)) {
    for await (const release of patchRelease[releaseName]) {
    }
  }
} catch (error) {
  core.setFailed(error.message);
}
