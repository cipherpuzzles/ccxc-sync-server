import { LeveldbPersistence } from 'y-leveldb';
import Config from '../config';

const ldb = new LeveldbPersistence(Config.yPersistence.dir);

export { ldb };