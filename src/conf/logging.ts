import * as winston from 'winston';

const logFormat = winston.format.printf(info => `${info.timestamp} ${info.level.toUpperCase()}: ${info.message}`);

const formatter = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss',
  }),
  logFormat,
);

winston.add(new winston.transports.Console({
  level: 'debug',
  format: formatter,
}));
