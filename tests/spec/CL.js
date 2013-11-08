/*
 * This file is part of WebCL – Web Computing Language.
 *
 * This Source Code Form is subject to the terms of the
 * Mozilla Public License, v. 2.0. If a copy of the MPL
 * was not distributed with this file, You can obtain
 * one at http://mozilla.org/MPL/2.0/.
 *
 * The Original Contributor of this Source Code Form is
 * Nokia Research Tampere (http://webcl.nokiaresearch.com).
 *
 * Author: Tomi Aarnio
 */

// Augment Jasmine with a "fail fast" mode to stop running a test
// suite immediately after the first failure.

jasmine.Env.prototype.failFast = function() {
  var env = this;
  env.afterEach(function() {
    if (!this.results().passed()) {
      env.specFilter = function(spec) {
        return false;
      };
    }
  });
};

// Uncomment the following line to enable the "fail fast" mode.
//jasmine.getEnv().failFast();

describe("Dynamic functionality", function() {

  var SELECTED_DEVICE = 1;

  var globals = {};

  beforeEach(function() {
    this.addMatchers({
      toEvaluateToTrue: function() {
        return eval(this.actual);
      },
    });
  });

  //////////////////////////////////////////////////////////////////////////////
  //
  //
  // 
  describe("CL.js", function() {
    
    it("must be able to create and retrieve Contexts", function() {
      var cl1 = new CL({ debug: false, cleanup: false });
      var cl2 = new CL({ debug: false, cleanup: false });

      var ctx1 = cl1.createContext({ name: 'foo' });
      var ctx2 = cl1.getContext('foo');
      expect(ctx1).toEqual(ctx2);

      var ctx3 = cl2.createContext({ name: 'bar' });
      var ctx4 = cl2.getContext('bar');
      expect(ctx3).toEqual(ctx4);

      expect(cl1.getContext('foo')).not.toBeNull();
      expect(cl2.getContext('foo')).toBeNull();
      CL.releaseAll();
    });

    it("must throw an exception on invalid input", function() {
      var cl = new CL({ debug: false, cleanup: false });
      var uri = 'kernels/rng.cl';
      var src = cl.loadSource(uri);
      var ctx = cl.createContext();
      expect(function() { cl.createContext({ device: 'foo' }) }).toThrow();
      expect(function() { ctx.buildKernel({ source: src, opts: '--invalid-option' }) }).toThrow();
      expect(function() { ctx.buildKernel({ source: 'foo' }) }).toThrow();
      expect(function() { ctx.buildKernel({ source: null }) }).toThrow();
      expect(function() { ctx.buildKernel({ uri: 'foo.cl' }) }).toThrow();
      expect(function() { ctx.buildKernel({ uri: null }) }).toThrow();
      expect(function() { ctx.buildKernel('foo.cl') }).toThrow();
      expect(function() { ctx.buildKernel('foo') }).toThrow();
      expect(function() { ctx.buildKernel(null) }).toThrow();
      expect(function() { ctx.buildKernel(0xdeadbeef) }).toThrow();
      expect(function() { ctx.buildKernel({}) }).toThrow();
      expect(function() { ctx.buildKernel() }).toThrow();
      CL.releaseAll();
    });

    it("must be able to build kernels from URI or source", function() {
      var cl = new CL({ debug: false, cleanup: false });
      var ctx = cl.createContext();
      var testFunc = function() {
        var uri = 'kernels/rng.cl';
        var src = cl.loadSource(uri);
        globals.program = ctx.buildProgram({ source: src });
        globals.kernel1 = ctx.buildKernel({ source: src });
        globals.kernel2 = ctx.buildKernel({ uri: 'kernels/rng.cl' });
        globals.kernel3 = ctx.buildKernel({ uri: 'kernels/rng.cl', opts: '-cl-fast-relaxed-math' });
        globals.kernel4 = ctx.buildKernel(src);
        globals.kernel5 = ctx.buildKernel(uri);
        globals.kernel6 = ctx.buildKernels(uri)[0];
        expect('globals.program instanceof WebCLProgram').toEvaluateToTrue();
        expect('globals.kernel1 instanceof WebCLKernel').toEvaluateToTrue();
        expect('globals.kernel2 instanceof WebCLKernel').toEvaluateToTrue();
        expect('globals.kernel3 instanceof WebCLKernel').toEvaluateToTrue();
        expect('globals.kernel4 instanceof WebCLKernel').toEvaluateToTrue();
        expect('globals.kernel5 instanceof WebCLKernel').toEvaluateToTrue();
        expect('globals.kernel6 instanceof WebCLKernel').toEvaluateToTrue();
      } 
      expect(testFunc).not.toThrow();
      CL.releaseAll();
    });

    it("should be able to build kernels from PTX source on NVIDIA GPUs", function() {
      var cl = new CL({ debug: false, cleanup: false });
      var ctx = cl.createContext();
      var testFunc = function() {
        if (ctx.device.platform.vendor.indexOf("NVIDIA") !== -1 || ctx.device.vendor.indexOf("NVIDIA") !== -1) {
          var uri = 'kernels/synthetic_case.O3.sm_21.ptx?ext=.cl';
          var src = cl.loadSource(uri);
          var prog1 = ctx.buildProgram({ ptx: src });
          globals.kernel1 = ctx.buildKernel({ ptx: src });
          expect(prog1.peer instanceof WebCLProgram).toBeTruthy();
          expect('globals.kernel1 instanceof WebCLKernel').toBeTruthy();
        }
      }
      expect(testFunc).not.toThrow();
      CL.releaseAll();
    });

  });

  //////////////////////////////////////////////////////////////////////////////
  //
  //
  // 
  describe("WebCLContext", function() {

    var CTX = null;
    var cl = null;

    beforeEach(function() {
      if (!cl) {
        console.log("WebCLContext test suite - beforeEach()");
        cl = new CL({ debug: false, cleanup: true });
      }
    });

    afterEach(function() {
      //cl.releaseAll();
    });

    function createContexts() {
      for (var d=0; d < cl.devices.length; d++) {
        cl.createContext({ device: cl.devices[d] });
      }
    };

    it("must be testable", function() {
      expect(cl.devices.length).toBeGreaterThan(0);
    });

    it("must be able to create a Context on default Device", function() {
      for (var p=0; p < cl.platforms.length; p++) {
        var plat = cl.platforms[p];
        var ctx = WebCL.createContext({ platform: plat });
        expect(typeof ctx).toBe('object');
        ctx.release();
      }
    });

    it("must be able to create a Context spanning all Devices on a Platform", function() {
      for (var p=0; p < cl.platforms.length; p++) {
        var plat = cl.platforms[p];
        var devices = [];
        for (var d=0; d < plat.devices.length; d++) {
          devices.push(plat.devices[d]);
        }
        var ctx = WebCL.createContext({ devices: devices });
        expect(typeof ctx).toBe('object');
        ctx.release();
      }
    });

    it("must be able to create a Context on any Device", function() {
      createContexts();
      for (var d=0; d < cl.devices.length; d++) {
        var ctx = cl.devices[d].contexts[0];
        expect(typeof ctx.peer).toBe('object');
      }
    });

    it("must be able to create a CommandQueue on any Device", function() {
      for (var d=0; d < cl.devices.length; d++) {
        var ctx = cl.devices[d].contexts[0];
        var queue = ctx.peer.createCommandQueue(cl.devices[d], null);
        expect(typeof queue).toBe('object');
        queue.release();
      }
    });

    it("must be able to create a 1 MB Buffer on any Device", function() {
      for (var d=0; d < cl.devices.length; d++) {
        var ctx = cl.devices[d].contexts[0];
        var buffer1M = ctx.peer.createBuffer(CL.MEM_READ_WRITE, 1024*1024);
        expect(typeof buffer1M).toBe('object');
        buffer1M.release();
      }
    });

    it("Must be able to read and write Buffers on any Device", function() {
      var input = new Float32Array(512);
      input[12] = 3.14159;
      var output = new Float32Array(512);
      for (var d=0; d < cl.devices.length; d++) {
        var ctx = cl.devices[d].contexts[0];
        var queue = ctx.createCommandQueue();
        var buffer1M = ctx.createBuffer({ size: 1024*1024 });
        function execute() {
          queue.enqueueWriteBuffer(buffer1M, input);
          queue.enqueueReadBuffer(buffer1M, output);
          queue.finish();
          for (var i=0; i < input.length; i++) {
            if (input[i] !== output[i]) {
              console.log("output[i] = ", output[i]);
              throw "input[i] !== output[i] for i="+i;
            }
          }
        }
        expect(execute).not.toThrow();
      }
    });

    it("must be able to release all CL resources allocated by this module", function() {
      cl.releaseAll();
      expect(cl.devices[0].contexts.length).toEqual(0);
    });

    //////////////////////////////////////////////////////////////////////////////
    //
    //
    // 
    describe("WebCLProgram", function() {

      var sobel;
      var cl = null;

      beforeEach(function() {
        if (!cl) {
          console.log("WebCLProgram test suite - beforeEach()");
          cl = new CL({ debug: false, cleanup: false });
          sobel = cl.loadSource('kernels/sobel.cl');
          for (var d=0; d < cl.devices.length; d++) {
            cl.createContext({ device: cl.devices[d] });
          }
        }
      });

      it("must be testable", function() {
        for (var d=0; d < cl.devices.length; d++) {
          var ctx = cl.devices[d].contexts[0];
          expect(ctx instanceof Object).toBe(true);
        } 
      });

      it("Must be able to build a Program from source", function() {
        for (var d=0; d < cl.devices.length; d++) {
          var ctx = cl.devices[d].contexts[0];
          var program = ctx.buildProgram({ source: sobel });
          expect(program.built).toEqual(true);
        }
      });

      // Excluded because querying PROGRAM_BINARY_SIZES crashes on Mac
      //
      xit("Must not crash when querying Program binary sizes", function() {
        for (var d=0; d < cl.devices.length; d++) {
          var ctx = cl.devices[d].contexts[0];
          var program = ctx.buildProgram({ source: sobel });
          function getBinaries() {
	          var sizes = program.peer.getInfo(CL.PROGRAM_BINARY_SIZES);
	          console.log("Size of binary executable in bytes: ", sizes[0]);
	          return sizes;
          }
          expect(getBinaries).toThrow();
        }
      });

      // Excluded because querying PROGRAM_BINARIES crashes on Mac
      //
      xit("Must not be able to get Program binaries", function() {
        for (var d=0; d < cl.devices.length; d++) {
          var ctx = cl.devices[d].contexts[0];
          var program = ctx.buildProgram({ source: sobel });
          function getBinaries() {
            return program.peer.getInfo(CL.PROGRAM_BINARIES);
          }
          expect(getBinaries).toThrow();
        }
      });

      it("Must be able to create a Kernel", function() {
        for (var d=0; d < cl.devices.length; d++) {
          var ctx = cl.devices[d].contexts[0];
          var kernel = ctx.buildKernel({ source: sobel });
          expect(kernel instanceof WebCLKernel).toBeTruthy();
        }
      });

      xit("Must be able to create a bunch of complex Kernels from a single source file", function() {
        var scanKernel = cl.loadSource('kernels/scan_kernel.cl');
        for (var d=0; d < cl.devices.length; d++) {
          var ctx = cl.devices[d].contexts[0];
          var kernels = ctx.buildKernels({ source: scanKernel });
          expect(kernels.length).toEqual(5);
        }
      });

      it("Must be able to run a Kernel", function() {
        var results = new Float32Array(512);
        var src = cl.loadSource('kernels/enqueueReadBuffer.cl');
        for (var d=0; d < cl.devices.length; d++) {
          var ctx = cl.devices[d].contexts[0];
          var kernel = ctx.buildKernel({ source: src, opts: "-Werror" });
          var queue = ctx.createCommandQueue();
          var buffer1M = ctx.createBuffer({ size: 1024*1024 });
          kernel.setArg(0, buffer1M);
          function execute() {
            queue.peer.enqueueNDRangeKernel(kernel, 1, [], [results.length], [], []);
            queue.peer.finish();
          }
          expect(execute).not.toThrow();
        }
      });

      it("Must support all kernel argument scalar types", function() {
        var result = new Int8Array([127]);
        var c = new Int8Array([-1]);
        var s = new Int16Array([-1]);
        var i = new Int32Array([-1]);
        var l = new Int32Array([-1, 0]);
        var uc = new Uint8Array([0xff]);
        var us = new Uint16Array([0xffff]);
        var ui = new Uint32Array([0xffffffff]);
        var ul = new Uint32Array([0xffffffff, 0]);
        var f32 = new Float32Array([1.0]);

        var src = cl.loadSource('kernels/argtypes.cl');
        for (var d=0; d < cl.devices.length; d++) {
          var ctx = cl.devices[d].contexts[0];
          ctx.buildKernels({ source: src, opts: "-Werror" });
          var kernel = ctx.getKernel('scalars');
          var queue = ctx.createCommandQueue();
          var resbuf = ctx.createBuffer({ size: 1 });
          function execute() {
            kernel.setArgs(resbuf, c, s, i, l, uc, us, ui, ul, f32);
            queue.peer.enqueueNDRangeKernel(kernel, 1, [], [1], [], []);
            queue.enqueueReadBuffer(resbuf, result);
            queue.peer.finish();
          }
          expect(execute).not.toThrow();
          expect(result[0]).toEqual(0);
        }
      });

      it("Must support all kernel argument vector types", function() {
        var result = new Int8Array([127]);
        var c = new Int8Array([-1, -1, -1, -1]);
        var s = new Int16Array([-1, -1, -1, -1]);
        var i = new Int32Array([-1, -1, -1, -1]);
        var l = new Int32Array([-1, 0, -1, 0, -1, 0, -1, ]);
        var uc = new Uint8Array([0xff, 0xff, 0xff, 0xff]);
        var us = new Uint16Array([0xffff, 0xffff, 0xffff, 0xffff]);
        var ui = new Uint32Array([0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff]);
        var ul = new Uint32Array([0xffffffff, 0, 0xffffffff, 0, 0xffffffff, 0, 0xffffffff, 0]);
        var f32 = new Float32Array([1.0, 1.0, 1.0, 1.0]);
        var src = cl.loadSource('kernels/argtypes.cl');
        for (var d=0; d < cl.devices.length; d++) {
          var ctx = cl.devices[d].contexts[0];
          ctx.buildKernels({ source: src, opts: "-Werror" });
          var kernel = ctx.getKernel('vectors');
          var queue = ctx.createCommandQueue();
          var resbuf = ctx.createBuffer({ size: 1 });
          function execute() {
            kernel.setArgs(resbuf, c, s, i, uc, us, ui, f32);
            queue.peer.enqueueNDRangeKernel(kernel, 1, [], [1], [], []);
            queue.enqueueReadBuffer(resbuf, result);
            queue.peer.finish();
          }
          expect(execute).not.toThrow();
          expect(result[0]).toEqual(0);
        }
      });

      it("must be able to release all CL resources allocated by this module", function() {
        cl.releaseAll();
        expect(cl.devices[0].contexts.length).toEqual(0);
      });
    });
  });

  //////////////////////////////////////////////////////////////////////////////
  //
  //
  // 
  describe("Performance", function() {

    var CTX = null;
    var cl = null; 

    beforeEach(function() {
      console.log("WebCL Performance test suite - beforeEach()");
      if (!cl) {
        cl = new CL({ debug: false, cleanup: false });
        sobel = cl.loadSource('kernels/sobel.cl');
      }
      for (var d=0; d < cl.devices.length; d++) {
        cl.createContext({ device: cl.devices[d] });
      }
      CTX = cl.devices[SELECTED_DEVICE].contexts[0];
    });

    afterEach(function() {
      console.log("WebCL Performance test suite - afterEach()");
      cl.releaseAll();
    });

    function calibrate(kernel, worksize) {
      var iter = 1;
      var msec = exec(kernel, worksize, iter).msec;
      while (msec < 50) {
        iter *= 2;
        msec = exec(kernel, worksize, iter).msec;
      }
      return iter;
    };

    function validate(kernel1, kernel2, worksize) {
      var res1 = new Float32Array(worksize);
      var res2 = new Float32Array(worksize);
      var queue = kernel1.context.queues[0];
      exec(kernel1, worksize, 1);
      queue.enqueueReadBuffer('buffer16M', res1);
      exec(kernel2, worksize, 1);
      queue.enqueueReadBuffer('buffer16M', res2);
      for (var i=0, diff=0; i < worksize; i++) {
        diff += Math.abs(res2[i] - res1[i]);
      }
      return diff / worksize;
    };

    function exec(kernel, worksize, iter) {
      var success = false;
      var queue = kernel.context.queues[0];
      var t1 = Date.now();
      try {
        for (var i=0; i < (iter || 1); i++) {
          queue.enqueueKernel(kernel, [worksize]);
        }
        queue.finish();
        success = true;
      } catch (e) {
        console.log(e);
      }
      var t2 = Date.now();
      var stats = {
        vendor : kernel.context.device.platform.vendor,
        device : kernel.context.device.name,
        msec : (success? t2-t1 : Number.NaN),
      }
      return stats;
    };

    //////////////////////////////////////////////////////////////////////////////
    //
    //
    // 
    describe("Math built-ins", function() {
      
      var BUFFERSIZE = 1e6;

      beforeEach(function() {
        console.log("WebCL Performance Math built-ins - beforeEach(): CTX.peer = ", CTX.peer);
        CTX.createBuffer({ size: BUFFERSIZE, name: 'buffer16M' });
        CTX.buildKernels('kernels/builtin-math.cl');
        CTX.createCommandQueue();
      });

      afterEach(function() {
        console.log("WebCL Performance Math built-ins - afterEach()");
        //CTX.releaseAll();
      });
      
      it("hypot() should be faster than a custom implementation", function() {
        var faster = CTX.getKernel('hypotBuiltin');
        var slower = CTX.getKernel('hypotCustom');
        faster.setArgs('buffer16M');
        slower.setArgs('buffer16M');
        var SAD = validate(faster, slower, BUFFERSIZE/4);
        expect(SAD).toBeCloseTo(0, 2);
        //var iter = calibrate(faster, BUFFERSIZE/4);
        var msecFaster = exec(faster, BUFFERSIZE/4, 1000).msec;
        //var msecSlower = exec(slower, BUFFERSIZE/4, 100).msec;
        //console.info(this.description + ": Expecting " + msecFaster + " to be less than " + msecSlower);
        //expect(msecFaster).toBeLessThan(msecSlower);
      });

      it("sincos() should be faster than sin() + cos()", function() {
        var faster = CTX.getKernel('sinCosCombined');
        var slower = CTX.getKernel('sinCosSeparate');
        faster.setArgs('buffer16M');
        slower.setArgs('buffer16M');
        var SAD = validate(faster, slower, BUFFERSIZE/4);
        expect(SAD).toBeCloseTo(0, 5);
        var iter = calibrate(faster, BUFFERSIZE/4);
        var msecFaster = exec(faster, BUFFERSIZE/4, iter).msec;
        var msecSlower = exec(slower, BUFFERSIZE/4, iter).msec;
        console.info(this.description + ": Expecting " + msecFaster + " to be less than " + msecSlower);
        expect(msecFaster).toBeLessThan(msecSlower);
      });
    });
    
    //////////////////////////////////////////////////////////////////////////////
    //
    //
    // 
    describe("OOB memory protection", function() {

      describe("Random Number Benchmark", function() {

        it("should be 1000x faster than JavaScript (handwritten asm.js)", function() {
          var BUFFERSIZE = 16*1024*1024;
          var WORKSIZE = BUFFERSIZE / 4;
          var JS_HANDICAP = 256;
          var HEAP = new ArrayBuffer(BUFFERSIZE/JS_HANDICAP);
          var rng = RNGModule(window, null, HEAP);
          var t1 = Date.now();
          rng(HEAP.byteLength, 0xdeadbeef, 5);
          var msJavaScript = (Date.now() - t1) * JS_HANDICAP;
          var heapView = new Uint8Array(HEAP);
          console.log("HEAP[t1 % HEAP.length]", heapView[t1 % heapView.length]);

          var srcMemProtectOn = cl.loadSource('kernels/rng2.safe.cl');
          var memProtectOn = CTX.buildKernel({ source: srcMemProtectOn });
          var buffer16M = CTX.createBuffer({ size: BUFFERSIZE });
          var queue = CTX.createCommandQueue();
          memProtectOn.setArgs(buffer16M, new Uint32Array([WORKSIZE, 0]), new Uint32Array([0xdeadbeef]));
          var msProtected = exec(memProtectOn, WORKSIZE, 5).msec;
          var slowdown = (msJavaScript / msProtected).toFixed(2);
          console.log(CTX.device.version, "-- speedup compared to JavaScript:", slowdown, "(", msProtected, "vs.", msJavaScript, ")");
          expect(slowdown).toBeGreaterThan(1000.0);

          function RNGModule(stdlib, foreign, heap) {
            "use asm"

            var ITER = 15;
            var k0 = 0xA341316C;
            var k1 = 0xC8013EA4;
            var k2 = 0xAD90777D;
            var k3 = 0x7E95761E;
            var delta = 0x9E3779B9;
            var dst = new stdlib.Uint8Array(heap);
            var i=0, j=0, k=0, x=0, y=0, r=0, g=0, sum=0, idx=0;

            function rng(worksize, seed, iter) {
              worksize = worksize|0;
              seed = seed|0;
              iter = iter|0;
              ITER = ITER|0;
              k0 = k0|0;
              k1 = k1|0
              k2 = k2|0
              k3 = k3|0
              delta = delta|0;
              for (k=0; (k|0) < (iter|0); k = (k+1)|0) {
                for (i=0; (i|0) < (worksize|0); i = (i+1)|0) {
                  x = seed;
                  y = x << 3;
                  x = x|0 + (i + (i << 11) + (i << 19));
                  y = y|0 + (i + (i << 9) + (i << 21));
                  sum = 0;
                  for (j=0; (j|0) < (ITER|0); j = (j+1)|0) {
                    sum = (sum + delta)|0;
                    x = x|0 + ((y << 4) + k0) & (y + sum) & ((y >>> 5) + k1);
                    y = y|0 + ((x << 4) + k2) & (x + sum) & ((x >>> 5) + k3);
                  }
                  r = (x & 0x00ff);
                  g = (x & 0xff00) >>> 8;
                  idx = (i << 2)|0;
                  dst[idx      ] = r;
                  dst[idx + 1|0] = r;
                  dst[idx + 2|0] = r;
                  dst[idx + 3|0] = g;
                }
              }
            };

            return rng;
          }
        });

        it("should have less than 5x protection overhead", function() {
          var srcMemProtectOff = cl.loadSource('kernels/rng2.cl');
          var srcMemProtectOn = cl.loadSource('kernels/rng2.safe.cl');
          var memProtectOff = CTX.buildKernel({ source: srcMemProtectOff });
          var memProtectOn = CTX.buildKernel({ source: srcMemProtectOn });
          var buffer16M = CTX.createBuffer({ size: 16*1024*1024 });
          var queue = CTX.createCommandQueue();
          var BUFFERSIZE = buffer16M.size / 4;
          var WORKSIZE = BUFFERSIZE;
          memProtectOff.setArgs(buffer16M, new Uint32Array([0xdeadbeef]));
          memProtectOn.setArgs(buffer16M, new Uint32Array([BUFFERSIZE, 0]), new Uint32Array([0xdeadbeef]));
          var msUnprotected = exec(memProtectOff, WORKSIZE, 5).msec;
          var msProtected = exec(memProtectOn, WORKSIZE, 5).msec;
          var slowdown = (msProtected / msUnprotected).toFixed(2);
          console.log(CTX.device.version, "-- slowdown from memory protection:", slowdown, "(", msUnprotected, "vs.", msProtected, ")");
          expect(slowdown).toBeLessThan(5.0);
        });

        it("should be faster using uint4 than uint[4]", function() {
          var src1 = cl.loadSource('kernels/rng.cl');
          var src2 = cl.loadSource('kernels/rng2.cl');
          var src1s = cl.loadSource('kernels/rng.safe.cl');
          var src2s = cl.loadSource('kernels/rng2.safe.cl');
          var kernel1 = CTX.buildKernel({ source: src1 });
          var kernel2 = CTX.buildKernel({ source: src2 });
          var kernel1s = CTX.buildKernel({ source: src1s });
          var kernel2s = CTX.buildKernel({ source: src2s });
          var buffer16M = CTX.createBuffer({ size: 16*1024*1024 });
          var queue = CTX.createCommandQueue();
          var BUFFERSIZE = buffer16M.size / 4;
          var WORKSIZE = BUFFERSIZE;
          kernel1.setArgs(buffer16M, new Uint32Array([0xdeadbeef]));
          kernel2.setArgs(buffer16M, new Uint32Array([0xdeadbeef]));
          kernel1s.setArgs(buffer16M, new Uint32Array([BUFFERSIZE, 0]), new Uint32Array([0xdeadbeef]));
          kernel2s.setArgs(buffer16M, new Uint32Array([BUFFERSIZE, 0]), new Uint32Array([0xdeadbeef]));
          var msKernel1 = exec(kernel1, WORKSIZE, 5).msec;
          var msKernel2 = exec(kernel2, WORKSIZE, 5).msec;
          var msKernel1s = exec(kernel1s, WORKSIZE, 5).msec;
          var msKernel2s = exec(kernel2s, WORKSIZE, 5).msec;
          console.log(CTX.device.version);
          console.log("  array unsafe :", msKernel1);
          console.log("  vector unsafe:", msKernel2);
          console.log("  array safe   :", msKernel1s);
          console.log("  vector safe  :", msKernel2s);
          var slowdownSafe = (msKernel1s / msKernel2s).toFixed(2);
          var slowdownUnsafe = (msKernel1 / msKernel2).toFixed(2);
          var protectionOverheadArray = (msKernel1s / msKernel1).toFixed(2);
          var protectionOverheadVector = (msKernel2s / msKernel2).toFixed(2);
          console.log("  protection overhead when using uint[4]:", protectionOverheadArray);
          console.log("  protection overhead when using uint4:", protectionOverheadVector);
          expect(msKernel1s).toBeGreaterThan(msKernel2s);
        });
      });

      it("should have less than 5x overhead in Awesomize Benchmark", function() {
        var srcMemProtectOff = cl.loadSource('kernels/complete_transformation.cl');
        var srcMemProtectOn = cl.loadSource('kernels/complete_transformation.safe.cl');
        var memProtectOff = CTX.buildKernel({ source: srcMemProtectOff });
        var memProtectOn = CTX.buildKernel({ source: srcMemProtectOn });
        var WORKSIZE = 1024*1024;
        var GROUPSIZE = Math.max(memProtectOn.workGroupSize, memProtectOff.workGroupSize);
        var bufferInput = CTX.createBuffer({ size: 16*WORKSIZE });    // sizeof(float4)=16
        var bufferOutput = CTX.createBuffer({ size: 16*WORKSIZE });
        var bufferConst = CTX.createBuffer({ flags: CL.MEM_READ_ONLY, size: 16*WORKSIZE });
        var queue = CTX.createCommandQueue();
        memProtectOff.setArgs(bufferInput, bufferOutput, bufferConst, new Uint32Array([GROUPSIZE*16]));
        memProtectOn.setArgs(bufferInput, new Uint32Array([WORKSIZE, 0]),
                             bufferOutput, new Uint32Array([WORKSIZE, 0]),
                             bufferConst, new Uint32Array([WORKSIZE, 0]),
                             new Uint32Array([GROUPSIZE*16]), new Uint32Array([GROUPSIZE, 0]));

        var msUnprotected = exec(memProtectOff, WORKSIZE).msec;
        var msProtected = exec(memProtectOn, WORKSIZE).msec;
        var slowdown = (msProtected / (msUnprotected || 1.0)).toFixed(2);
        console.log(CTX.device.version, "-- slowdown from memory protection:", slowdown, "(", msUnprotected, "vs.", msProtected, ")");
        expect(slowdown).toBeLessThan(5.0);
      });

      it("should have less than 2x overhead in Benchmark #3 (NVIDIA PTX only)", function() {
        var srcOriginal = cl.loadSource('kernels/synthetic_case.O3.sm_21.ptx?foo.cl');
        var srcProtected = cl.loadSource('kernels/synthetic_case.O3.clamped.O3.sm_21.ptx?foo.cl');
        if (CTX.device.platform.vendor.indexOf("NVIDIA") !== -1 || CTX.device.vendor.indexOf("NVIDIA") !== -1) {
          var defs = { KERNEL_LOOP_COUNT : 64, PRIVATE_BUFFER_SIZE : 128 };
          var kernelOriginal = CTX.buildKernel({ ptx: srcOriginal });
          var kernelProtected = CTX.buildKernel({ ptx: srcProtected });
          var buffer = CTX.createBuffer({ size: 16*1024*1024 });
          var queue = CTX.createCommandQueue();
          var BUFFERSIZE = buffer.size / 4;
          var WORKSIZE = BUFFERSIZE / defs.KERNEL_LOOP_COUNT;
          kernelOriginal.setArgs(buffer, new Uint32Array([BUFFERSIZE]), buffer, new Uint32Array([BUFFERSIZE]));
          kernelProtected.setArgs(buffer, new Uint32Array([BUFFERSIZE]), new Uint32Array([BUFFERSIZE]), 
                                  buffer, new Uint32Array([BUFFERSIZE]), new Uint32Array([BUFFERSIZE]));
          var msecOriginal = exec(kernelOriginal, WORKSIZE, 4).msec;
          var msecProtected = exec(kernelProtected, WORKSIZE, 4).msec;
          var slowdown = (msecProtected / msecOriginal).toFixed(2);
          console.log("Slowdown from memory protection:", slowdown);
          expect(slowdown).toBeLessThan(2.0);
        }
      });
    });
  });

  //////////////////////////////////////////////////////////////

  xdescribe("Generic JavaScript performance tests", function() {

    it("clearing an Array by setting its length to zero should be faster than allocating a new Array", function() {
      var ITER = 1e6;

      var myArray2 = [ 1, 2, 3, 4, 5, 6, { foo: 'bar' }, 8, 9, 10 ];
      var t3 = Date.now();
      for (var i=0; i < ITER; i++) {
        myArray2 = [];
        for (var j=0; j < 10; j++) {
          myArray2[j] = j;
        }
      }
      var t4 = Date.now();
      var method2 = t4-t3;

      var myArray1 = [ 1, 2, 3, 4, 5, 6, { foo: 'bar' }, 8, 9, 10 ];
      var t1 = Date.now();
      for (var i=0; i < ITER; i++) {
        myArray1.length = 0;
        for (var j=0; j < 10; j++) {
          myArray1[j] = j;
        }
      }
      var t2 = Date.now();
      var method1 = t2-t1;
      
      var myArray3 = [ 1, 2, 3, 4, 5, 6, { foo: 'bar' }, 8, 9, 10 ];
      var t5 = Date.now();
      for (var i=0; i < ITER; i++) {
        for (var j=0; j < 10; j++) {
          myArray3[j] = j;
        }
      }
      var t6 = Date.now();
      var method3 = t6-t5;

      console.log("Using myarray.length=0:", method1);
      console.log("Using myarray = []:", method2);
      console.log("Baseline (don't clear): ", method3);
    });

  });

});
