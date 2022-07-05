'use strict';

const unit = require('heya-unit');

const {streamToArray, delay} = require('./helpers');
const chain = require('../src/index');
const fromIterable = require('../src/utils/fromIterable');

const {none, finalValue, many, gen} = chain;

unit.add(module, [
  function test_gen(t) {
    const async = t.startAsync('test_gen');

    const output = [],
      c = chain([
        fromIterable([1, 2, 3]),
        gen(
          x => x * x,
          x => 2 * x + 1
        ),
        streamToArray(output)
      ]);

    c.on('end', () => {
      eval(t.TEST('t.unify(output, [3, 9, 19])'));
      async.done();
    });
  },
  function test_genFinal(t) {
    const async = t.startAsync('test_genFinal');

    const output = [],
      c = chain([
        fromIterable([1, 2, 3]),
        gen(
          x => x * x,
          x => finalValue(x),
          x => 2 * x + 1
        ),
        streamToArray(output)
      ]);

    c.on('end', () => {
      eval(t.TEST('t.unify(output, [1, 4, 9])'));
      async.done();
    });
  },
  function test_compNothing(t) {
    const async = t.startAsync('test_compNothing');

    const output = [],
      c = chain([
        fromIterable([1, 2, 3]),
        gen(
          x => x * x,
          () => none,
          x => 2 * x + 1
        ),
        streamToArray(output)
      ]);

    c.on('end', () => {
      eval(t.TEST('t.unify(output, [])'));
      async.done();
    });
  },
  function test_genEmpty(t) {
    const async = t.startAsync('test_genEmpty');

    const output = [],
      c = chain([fromIterable([1, 2, 3]), x => x * x, gen(), streamToArray(output)]);

    c.on('end', () => {
      eval(t.TEST('t.unify(output, [1, 4, 9])'));
      async.done();
    });
  },
  function test_genAsync(t) {
    const async = t.startAsync('test_genAsync');

    const output = [],
      c = chain([
        fromIterable([1, 2, 3]),
        gen(
          delay(x => x * x),
          x => 2 * x + 1
        ),
        streamToArray(output)
      ]);

    c.on('end', () => {
      eval(t.TEST('t.unify(output, [3, 9, 19])'));
      async.done();
    });
  },
  function test_genGenerator(t) {
    const async = t.startAsync('test_genGenerator');

    const output = [],
      c = chain([
        fromIterable([1, 2, 3]),
        gen(
          x => x * x,
          function* (x) {
            yield x;
            yield x + 1;
            yield x + 2;
          },
          x => 2 * x + 1
        ),
        streamToArray(output)
      ]);

    c.on('end', () => {
      eval(t.TEST('t.unify(output, [3, 5, 7, 9, 11, 13, 19, 21, 23])'));
      async.done();
    });
  },
  function test_genMany(t) {
    const async = t.startAsync('test_genMany');

    const output = [],
      c = chain([
        fromIterable([1, 2, 3]),
        gen(
          x => x * x,
          x => many([x, x + 1, x + 2]),
          x => 2 * x + 1
        ),
        streamToArray(output)
      ]);

    c.on('end', () => {
      eval(t.TEST('t.unify(output, [3, 5, 7, 9, 11, 13, 19, 21, 23])'));
      async.done();
    });
  },
  function test_genCombined(t) {
    const async = t.startAsync('test_genCombined');

    const output = [],
      c = chain([
        fromIterable([1, 2]),
        gen(
          delay(x => -x),
          x => many([x, x * 10]),
          function* (x) {
            yield x;
            yield x - 1;
          },
          x => -x
        ),
        streamToArray(output)
      ]);

    c.on('end', () => {
      eval(t.TEST('t.unify(output, [1, 2, 10, 11, 2, 3, 20, 21])'));
      async.done();
    });
  },
  function test_genCombinedFinal(t) {
    const async = t.startAsync('test_genCombinedFinal');

    const output = [],
      c = chain([
        fromIterable([1, 2]),
        gen(
          delay(x => -x),
          x => many([x, x * 10]),
          function* (x) {
            yield x;
            yield finalValue(x - 1);
          },
          x => -x
        ),
        streamToArray(output)
      ]);

    c.on('end', () => {
      eval(t.TEST('t.unify(output, [1, -2, 10, -11, 2, -3, 20, -21])'));
      async.done();
    });
  },
  function test_genSyncIterator(t) {
    const async = t.startAsync('test_genSyncIterator');

    const output = [],
      c = chain([
        fromIterable([1, 2]),
        gen(
          delay(x => -x),
          x => many([x, x * 10]),
          function* (x) {
            yield x;
            yield finalValue(x - 1);
          },
          x => -x
        ),
        streamToArray(output)
      ]);

    c.on('end', () => {
      eval(t.TEST('t.unify(output, [1, -2, 10, -11, 2, -3, 20, -21])'));
      async.done();
    });
  },
  function test_genAsyncIterator(t) {
    const async = t.startAsync('test_genAsyncIterator');

    const output = [],
      c = chain([
        fromIterable([1, 2]),
        gen(
          delay(x => -x),
          x => many([x, x * 10]),
          async function* (x) {
            yield delay(x => x)(x);
            yield delay(x => finalValue(x - 1))(x);
          },
          x => -x
        ),
        streamToArray(output)
      ]);

    c.on('end', () => {
      eval(t.TEST('t.unify(output, [1, -2, 10, -11, 2, -3, 20, -21])'));
      async.done();
    });
  }
]);
