'use strict';

const defs = require('./defs');

const next = async (value, fns, index, collect) => {
  let cleanIndex;
  try {
    for (let i = index; i <= fns.length; ++i) {
      if (value && typeof value.then == 'function') {
        // thenable
        value = await value;
      }
      if (value === defs.none) break;
      if (value === defs.stop) {
        cleanIndex = i - 1;
        throw new defs.Stop();
      }
      if (value && value[defs.finalSymbol] === 1) {
        collect(value.value);
        break;
      }
      if (value && value[defs.manySymbol] === 1) {
        const values = value.values;
        if (i == fns.length) {
          values.forEach(val => collect(val));
        } else {
          for (let j = 0; j < values.length; ++j) {
            await next(values[j], fns, i, collect);
          }
        }
        break;
      }
      if (value && typeof value.next == 'function') {
        // generator
        for (;;) {
          let data = value.next();
          if (data && typeof data.then == 'function') {
            data = await data;
          }
          if (data.done) break;
          if (i == fns.length) {
            collect(data.value);
          } else {
            await next(data.value, fns, i, collect);
          }
        }
        break;
      }
      if (i == fns.length) {
        collect(value);
        break;
      }
      cleanIndex = i + 1;
      const f = fns[i];
      value = f(value);
    }
  } catch (error) {
    if (error instanceof defs.Stop) {
      await flush(fns, cleanIndex, collect);
    }
    throw error;
  }
};

const flush = async (fns, index, collect) => {
  for (let i = index; i < fns.length; ++i) {
    const f = fns[i];
    if (f[defs.flushSymbol] === 1) {
      await next(f(defs.none), fns, i + 1, collect);
    }
  }
};

const collect = (collect, fns) => {
  fns = fns
    .filter(fn => fn)
    .flat(Infinity)
    .map(fn => (defs.isFunctionList(fn) ? defs.getFunctionList(fn) : fn))
    .flat(Infinity);
  if (!fns.length) {
    fns = [x => x];
  }
  let flushed = false;
  let g = async value => {
    if (flushed) throw Error('Call to a flushed pipe.');
    if (value !== defs.none) {
      await next(value, fns, 0, collect);
    } else {
      flushed = true;
      await flush(fns, 0, collect);
    }
  };
  const needToFlush = fns.some(fn => defs.isFlushable(fn));
  if (needToFlush) g = defs.flushable(g);
  return defs.setFunctionList(g, fns);
};

const asArray = (...fns) => {
  let results = null;
  const f = collect(value => results.push(value), fns);
  let g = async value => {
    results = [];
    await f(value);
    const r = results;
    results = null;
    return r;
  };
  if (defs.isFlushable(f)) g = defs.flushable(g);
  return defs.setFunctionList(g, defs.getFunctionList(f));
};

const fun = (...fns) => {
  const f = asArray(...fns);
  let g = value =>
    f(value).then(results => {
      switch (results.length) {
        case 0:
          return defs.none;
        case 1:
          return results[0];
      }
      return {[defs.manySymbol]: 1, values: results};
    });
  if (defs.isFlushable(f)) g = defs.flushable(g);
  return defs.setFunctionList(g, defs.getFunctionList(f));
};

module.exports = fun;

module.exports.next = next;
module.exports.collect = collect;
module.exports.asArray = asArray;
