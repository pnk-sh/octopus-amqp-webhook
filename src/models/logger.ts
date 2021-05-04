import { configure, getLogger } from "log4js";

configure({
  appenders: {
    multi: {
      type: "multiFile",
      base: 'logs/',
      property: 'categoryName',
      extension: '.log',
      maxLogSize: 10485760,
      backups: 3,
      compress: true
    },
    out: { type: 'stdout' },
  },
  categories: {
    default: {
      appenders: ["multi", "out"],
      level: "debug"
    }
  }
});

const logger = getLogger();

export default logger