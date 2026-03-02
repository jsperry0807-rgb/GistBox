import Conf from "conf";
import { type ConfigSchema } from "../types/index.js";

const config = new Conf<ConfigSchema>({
  projectName: "gistbox",
  defaults: {
    githubToken: null,
    pinnedGists: [],
    cacheTTL: 3600,
  },
});

export default config;
