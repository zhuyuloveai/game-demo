import { createGame } from './engine.mjs';
self.onmessage = ({ data }) => {
  try { self.postMessage({ game: createGame(data.level, data.seed, data.mode) }); }
  catch (error) { self.postMessage({ error: error.message }); }
};
