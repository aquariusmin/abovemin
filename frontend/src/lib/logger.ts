type Level = 'info' | 'warn' | 'error';

function emit(level: Level, msg: string, meta?: unknown) {
  const payload = meta !== undefined ? { msg, meta } : { msg };
  const line = JSON.stringify({ level, time: new Date().toISOString(), ...payload });
  if (level === 'error') console.error(line);
  else if (level === 'warn') console.warn(line);
  else console.log(line);
}

export const log = {
  info:  (msg: string, meta?: unknown) => emit('info', msg, meta),
  warn:  (msg: string, meta?: unknown) => emit('warn', msg, meta),
  error: (msg: string, meta?: unknown) => emit('error', msg, meta),
};
