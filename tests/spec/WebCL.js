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

describe("WebCL", function() {

  var SELECTED_DEVICE = 0;

  //////////////////////////////////////////////////////////////////////////////
  //
  //
  // 
  describe("window.WebCL", function() {

    it("must exist", function() {
      expect(WebCL).toBeDefined();
    });

    it("must have all specified classes", function() {
      for (var className in expectedClasses) {
        expect(window).toHaveFunction(className);
      }
    });

    it("must have all specified functions", function() {
      for (var funcName in expectedFunctions.WebCL) {
        if (expectedFunctions.WebCL[funcName] === true) {
          expect(WebCL).toHaveFunction(funcName);
        }
      }
    });
    
    xit("must not have functions that have been removed", function() {
      for (var funcName in expectedFunctions.WebCL) {
        if (expectedFunctions.WebCL[funcName] === false) {
          expect(WebCL).not.toHaveFunction(funcName);
        }
      }
    });

    it("must have error code enums ranging from 0 to -64", function() {
      for (var enumName in errorEnums) {
        var actualValue = WebCL[enumName];
        var expectedValue = errorEnums[enumName];
        expect(actualValue).toBeDefined();
        expect(actualValue).toEqual(expectedValue);
      }
    });

    xit("must not have error code enums that have been removed", function() {
      for (var enumName in removedErrorEnums) {
        expect(WebCL[enumName]).not.toBeDefined();
      }
    });

    it("must have device info enums ranging from 0x1000 to 0x103D", function() {
      for (var enumName in deviceInfoEnums) {
        var actualValue = WebCL[enumName];
        var expectedValue = deviceInfoEnums[enumName];
        expect(actualValue).toBeDefined();
        expect(actualValue).toEqual(expectedValue);
      }
    });

    xit("must not have device info enums that have been removed", function() {
      for (var enumName in removedDeviceInfoEnums) {
        expect(WebCL[enumName]).not.toBeDefined();
      }
    });

    it("must have at least one Platform", function() {
      expect(WebCL.getPlatforms().length).toBeGreaterThan(0);
    });

    it("must have at least one Device on each Platform", function() {
      var platforms = WebCL.getPlatforms();
      for (var p=0; p < platforms.length; p++) {
        expect(platforms[p].getDevices().length).toBeGreaterThan(0);
      }
    });

    it("must have all Devices on all Platforms available", function() {
      var platforms = WebCL.getPlatforms();
      for (var p=0; p < platforms.length; p++) {
        var devices = platforms[p].getDevices();
        for (var d=0; d < devices.length; d++) {
          expect(devices[d].getInfo(WebCL.CL_DEVICE_AVAILABLE)).toEqual(true);
        }
      }
    });
  });

  describe("WebCLPlatform", function() {
    it("must have all specified functions", function() {
      var plat = WebCL.getPlatforms()[0];
      for (var funcName in expectedFunctions.WebCLPlatform) {
        if (expectedFunctions.WebCLPlatform[funcName] === true) {
          expect(plat).toHaveFunction(funcName);
        }
      }
    });

    xit("must not have functions that have been removed", function() {
      var plat = WebCL.getPlatforms()[0];
      for (var funcName in expectedFunctions.WebCLPlatform) {
        if (expectedFunctions.WebCLPlatform[funcName] === false) {
          expect(plat).not.toHaveFunction(funcName);
        }
      }
    });
  });

  describe("WebCLDevice", function() {
    it("must have all specified functions", function() {
      var device = WebCL.getPlatforms()[0].getDevices()[0];
      for (var funcName in expectedFunctions.WebCLDevice) {
        if (expectedFunctions.WebCLDevice[funcName] === true) {
          expect(device).toHaveFunction(funcName);
        }
      }
    });

    xit("must not have functions that have been removed", function() {
      var device = WebCL.getPlatforms()[0].getDevices()[0];
      for (var funcName in expectedFunctions.WebCLDevice) {
        if (expectedFunctions.WebCLDevice[funcName] === false) {
          expect(device).not.toHaveFunction(funcName);
        }
      }
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
        var prog1 = ctx.build({ source: src });
        var kernel1 = ctx.buildKernel({ source: src });
        var kernel2 = ctx.buildKernel({ uri: 'kernels/rng.cl' });
        var kernel2 = ctx.buildKernel({ uri: 'kernels/rng.cl', opts: '-cl-fast-relaxed-math' });
        var kernel3 = ctx.buildKernel(src);
        var kernel4 = ctx.buildKernel(uri);
        var kernel5 = ctx.buildKernels(uri)[0];
        expect(prog1.peer instanceof WebCLProgram).toBeTruthy();
        expect(kernel1.peer instanceof WebCLKernel).toBeTruthy();
        expect(kernel2.peer instanceof WebCLKernel).toBeTruthy();
        expect(kernel3.peer instanceof WebCLKernel).toBeTruthy();
        expect(kernel4.peer instanceof WebCLKernel).toBeTruthy();
        expect(kernel5.peer instanceof WebCLKernel).toBeTruthy();
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
          var prog1 = ctx.build({ ptx: src });
          var kernel1 = ctx.buildKernel({ ptx: src });
          expect(prog1.peer instanceof WebCLProgram).toBeTruthy();
          expect(kernel1.peer instanceof WebCLKernel).toBeTruthy();
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

    var cl = null;

    function beforeAny() {
      console.log("WebCLContext test suite - beforeAny()");
      cl = new CL({ debug: true, cleanup: true });
    };

    function createContexts() {
      for (var d=0; d < cl.devices.length; d++) {
        cl.createContext({ device: cl.devices[d] });
      }
    };

    it("must be testable", function() {
      beforeAny();
      expect(cl.devices.length).toBeGreaterThan(0);
    });

    it("must be able to create a Context on default Device", function() {
      for (var p=0; p < cl.platforms.length; p++) {
        var plat = cl.platforms[p].peer;
        var device = cl.platforms[p].devices[0].peer;
        var ctx = WebCL.createContext();
        expect(typeof ctx).toBe('object');
        ctx.release();
      }
    });

    it("must be able to create a Context on default Device", function() {
      for (var p=0; p < cl.platforms.length; p++) {
        var plat = cl.platforms[p].peer;
        var device = cl.platforms[p].devices[0].peer;
        var ctx = WebCL.createContext();
        expect(typeof ctx).toBe('object');
        ctx.release();
      }
    });

    it("must be able to create a Context spanning all Devices on a Platform", function() {
      for (var p=0; p < cl.platforms.length; p++) {
        var plat = cl.platforms[p].peer;
        var devices = [];
        for (var d=0; d < cl.platforms[p].devices.length; d++) {
          devices.push(cl.platforms[p].devices[d].peer);
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
        var queue = ctx.peer.createCommandQueue(cl.devices[d].peer, null);
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

    describe("WebCLProgram", function() {

      var sobel;
      var cl = null;

      function beforeAny() {
        console.log("WebCLProgram test suite - beforeAny()");
        cl = new CL({ debug: true, cleanup: false });
        sobel = cl.loadSource('kernels/sobel.cl');
        for (var d=0; d < cl.devices.length; d++) {
          cl.createContext({ device: cl.devices[d] });
        }
      };

      it("must be testable", function() {
        beforeAny();
        for (var d=0; d < cl.devices.length; d++) {
          var ctx = cl.devices[d].contexts[0];
          expect(ctx instanceof Object).toBe(true);
        } 
      });

      it("Must be able to build a Program from source", function() {
        for (var d=0; d < cl.devices.length; d++) {
          var ctx = cl.devices[d].contexts[0];
          var program = ctx.build({ source: sobel });
          expect(program.built).toEqual(true);
        }
      });

      // Excluded because querying PROGRAM_BINARY_SIZES crashes on Mac
      //
      xit("Must not crash when querying Program binary sizes", function() {
        for (var d=0; d < cl.devices.length; d++) {
          var ctx = cl.devices[d].contexts[0];
          var program = ctx.build({ source: sobel });
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
          var program = ctx.build({ source: sobel });
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
          expect(typeof kernel.peer).toBe('object');
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
          kernel.setArgTypes('BUFFER');
          kernel.setArgs(buffer1M);
          function execute() {
            queue.peer.enqueueNDRangeKernel(kernel.peer, 1, [], [results.length], [], []);
            queue.peer.finish();
          }
          expect(execute).not.toThrow();
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
    var cl = new CL({ debug: false, cleanup: false });

    beforeEach(function() {
      for (var d=0; d < cl.devices.length; d++) {
        cl.createContext({ device: cl.devices[d] });
      }
      CTX = cl.devices[SELECTED_DEVICE].contexts[0];
    });

    afterEach(function() {
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
        //console.log(e);
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
      
      var BUFFERSIZE = 16*1024*1024;

      beforeEach(function() {
        CTX.createBuffer({ size: BUFFERSIZE, name: 'buffer16M' });
        CTX.buildKernels('kernels/builtin-math.cl');
        CTX.createCommandQueue();
      });

      afterEach(function() {
        CL.releaseAll();
      });
      
      it("hypot() should be faster than a custom implementation", function() {
        var faster = CTX.getKernel('hypotBuiltin');
        var slower = CTX.getKernel('hypotCustom');
        faster.setArgTypes('BUFFER');
        faster.setArgs('buffer16M');
        slower.setArgTypes('BUFFER');
        slower.setArgs('buffer16M');
        var SAD = validate(faster, slower, BUFFERSIZE/4);
        expect(SAD).toBeCloseTo(0, 2);
        var iter = calibrate(faster, BUFFERSIZE/4);
        var msecFaster = exec(faster, BUFFERSIZE/4, iter).msec;
        var msecSlower = exec(slower, BUFFERSIZE/4, iter).msec;
        console.info(this.description + ": Expecting " + msecFaster + " to be less than " + msecSlower);
        expect(msecFaster).toBeLessThan(msecSlower);
      });

      it("sincos() should be faster than sin() + cos()", function() {
        var faster = CTX.getKernel('sinCosCombined');
        var slower = CTX.getKernel('sinCosSeparate');
        faster.setArgTypes('BUFFER');
        faster.setArgs('buffer16M');
        slower.setArgTypes('BUFFER');
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
          memProtectOn.setArgTypes('BUFFER', 'ULONG', 'UINT');
          memProtectOn.setArgs(buffer16M, WORKSIZE, 0xdeadbeef);
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
          memProtectOff.setArgTypes('BUFFER', 'UINT');
          memProtectOff.setArgs(buffer16M, 0xdeadbeef);
          memProtectOn.setArgTypes('BUFFER', 'ULONG', 'UINT');
          memProtectOn.setArgs(buffer16M, BUFFERSIZE, 0xdeadbeef);
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
          kernel1.setArgTypes('BUFFER', 'UINT');
          kernel1.setArgs(buffer16M, 0xdeadbeef);
          kernel2.setArgTypes('BUFFER', 'UINT');
          kernel2.setArgs(buffer16M, 0xdeadbeef);
          kernel1s.setArgTypes('BUFFER', 'ULONG', 'UINT');
          kernel1s.setArgs(buffer16M, BUFFERSIZE, 0xdeadbeef);
          kernel2s.setArgTypes('BUFFER', 'ULONG', 'UINT');
          kernel2s.setArgs(buffer16M, BUFFERSIZE, 0xdeadbeef);
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
        memProtectOff.setArgTypes('BUFFER', 'BUFFER', 'BUFFER', 'LOCAL');
        memProtectOff.setArgs(bufferInput, bufferOutput, bufferConst, GROUPSIZE*16);
        memProtectOn.setArgTypes('BUFFER', 'ULONG', 'BUFFER', 'ULONG', 'BUFFER', 'ULONG', 'LOCAL', 'ULONG');
        memProtectOn.setArgs(bufferInput, WORKSIZE,
                             bufferOutput, WORKSIZE,
                             bufferConst, WORKSIZE,
                             GROUPSIZE*16, GROUPSIZE);

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
          kernelOriginal.setArgTypes('BUFFER', 'UINT', 'BUFFER', 'UINT');
          kernelOriginal.setArgs(buffer, BUFFERSIZE, buffer, BUFFERSIZE);
          kernelProtected.setArgTypes('BUFFER', 'UINT', 'UINT', 'BUFFER', 'UINT', 'UINT');
          kernelProtected.setArgs(buffer, BUFFERSIZE, BUFFERSIZE, buffer, BUFFERSIZE, BUFFERSIZE);
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


  //////////////////////////////////////////////////////////////

  beforeEach(function() {
    this.addMatchers({
      toHaveProperty: function(name) {
        var obj = this.actual;
        return (obj[name] !== undefined);
      },
      toHaveFunction: function(name) {
        var obj = this.actual;
        return (typeof(obj[name]) === 'function');
      },
    });
  });

  //////////////////////////////////////////////////////////////

  var expectedClasses = {
    WebCLPlatform : true,
    WebCLDevice : true,
    WebCLContext : true,
    WebCLCommandQueue : true,
    WebCLMemoryObject : true,
    WebCLBuffer : true,
    WebCLImage : true,
    WebCLSampler : true,
    WebCLProgram : true,
    WebCLKernel : true,
    WebCLEvent : true,
    WebCLUserEvent : true,
  };

  var expectedFunctions = {

    WebCL : {
      getPlatforms : true,
      createContext : true,
      getSupportedExtensions : true,
      enableExtension : true,
      waitForEvents : true,
      releaseAll : true,
      getPlatformIDs : false,         // renamed to getPlatforms
      createContextFromType : false,  // merged into createContext
    },

    WebCLPlatform : {
      getInfo : true,
      getDevices : true,
      getSupportedExtensions : true,
      enableExtension : true,
      getDeviceIDs : false,           // renamed to getDevices
      getPlatformInfo : false,        // renamed to getInfo
    },

    WebCLDevice : {
      getInfo : true,
      getSupportedExtensions : true,
      enableExtension : true,
      getDeviceInfo : false,          // renamed to getInfo
    },

    WebCLContext : {
      createBuffer : true,
      createCommandQueue : true,
      createImage : true,
      createProgram : true,
      createSampler : true,
      createUserEvent : true,
      getInfo : true,
      getSupportedImageFormats : true,
      release : true,
      releaseAll : true,
      createImage2D : false,            // renamed to createImage
      createImage3D : false,            // disallowed by WebCL
      createProgramWithSource : false,  // renamed to createProgram
      createProgramWithBinary : false,  // disallowed by WebCL
    },

    WebCLCommandQueue : {
      enqueueCopyBuffer : true,
      enqueueCopyBufferRect : true,
      enqueueCopyImage : true,
      enqueueCopyImageToBuffer : true,
      enqueueCopyBufferToImage : true,
      enqueueReadBuffer : true,
      enqueueReadBufferRect : true,
      enqueueReadImage : true,
      enqueueWriteBuffer : true,
      enqueueWriteBufferRect : true,
      enqueueWriteImage : true,
      enqueueNDRangeKernel : true,
      enqueueMarker : true,
      enqueueBarrier : true,
      enqueueWaitForEvents : true,
      finish : true,
      flush : true,
      getInfo : true,
      release : true,
      enqueueTask : false,              // disallowed by WebCL
    },

    WebCLMemoryObject : {
      getInfo : true,
      release : true,
    },

    WebCLBuffer : {
      createSubBuffer : true,
    },

    WebCLImage : {
      getInfo : true,
    },

    WebCLSampler : {
      getInfo : true,
      release : true,
    },

    WebCLProgram : {
      getInfo : true,
      getBuildInfo : true,
      build : true,
      createKernel : true,
      createKernelsInProgram : true,
      release : true,
      buildProgram : false,          // renamed to build
      getProgramInfo : false,        // renamed to getInfo
      getProgramBuildInfo : false,   // renamed to getBuildInfo
    },

    WebCLKernel : {
      getInfo : true,
      getWorkGroupInfo : true,
      setArg : true,
      release : true,
    },

    WebCLEvent : {
      getInfo : true,
      getProfilingInfo : true,
      setCallback : true,
      release : true,
    },

    WebCLUserEvent : {
      setUserEventStatus : true,
    },
  };

  var errorEnums = {
    /* Error Codes */
    SUCCESS                                   : 0,
    DEVICE_NOT_FOUND                          : -1,
    DEVICE_NOT_AVAILABLE                      : -2,
    MEM_OBJECT_ALLOCATION_FAILURE             : -4,
    OUT_OF_RESOURCES                          : -5,
    OUT_OF_HOST_MEMORY                        : -6,
    PROFILING_INFO_NOT_AVAILABLE              : -7,
    MEM_COPY_OVERLAP                          : -8,
    IMAGE_FORMAT_MISMATCH                     : -9,
    IMAGE_FORMAT_NOT_SUPPORTED                : -10,
    BUILD_PROGRAM_FAILURE                     : -11,
    MISALIGNED_SUB_BUFFER_OFFSET              : -13,
    EXEC_STATUS_ERROR_FOR_EVENTS_IN_WAIT_LIST : -14,
    INVALID_VALUE                             : -30,
    INVALID_DEVICE_TYPE                       : -31,
    INVALID_PLATFORM                          : -32,
    INVALID_DEVICE                            : -33,
    INVALID_CONTEXT                           : -34,
    INVALID_QUEUE_PROPERTIES                  : -35,
    INVALID_COMMAND_QUEUE                     : -36,
    INVALID_HOST_PTR                          : -37,
    INVALID_MEM_OBJECT                        : -38,
    INVALID_IMAGE_FORMAT_DESCRIPTOR           : -39,
    INVALID_IMAGE_SIZE                        : -40,
    INVALID_SAMPLER                           : -41,
    INVALID_BUILD_OPTIONS                     : -43,
    INVALID_PROGRAM                           : -44,
    INVALID_PROGRAM_EXECUTABLE                : -45,
    INVALID_KERNEL_NAME                       : -46,
    INVALID_KERNEL_DEFINITION                 : -47,
    INVALID_KERNEL                            : -48,
    INVALID_ARG_INDEX                         : -49,
    INVALID_ARG_VALUE                         : -50,
    INVALID_ARG_SIZE                          : -51,
    INVALID_KERNEL_ARGS                       : -52,
    INVALID_WORK_DIMENSION                    : -53,
    INVALID_WORK_GROUP_SIZE                   : -54,
    INVALID_WORK_ITEM_SIZE                    : -55,
    INVALID_GLOBAL_OFFSET                     : -56,
    INVALID_EVENT_WAIT_LIST                   : -57,
    INVALID_EVENT                             : -58,
    INVALID_OPERATION                         : -59,
    INVALID_BUFFER_SIZE                       : -61,
    INVALID_GLOBAL_WORK_SIZE                  : -63,
    INVALID_PROPERTY                          : -64,
  };

  var removedErrorEnums = {
    COMPILER_NOT_AVAILABLE                    : -3,
    MAP_FAILURE                               : -12,
    INVALID_BINARY                            : -42,
    INVALID_GL_OBJECT                         : -60,
    INVALID_MIP_LEVEL                         : -62,
  };

  var deviceInfoEnums = {
    /* cl_device_info */
    DEVICE_TYPE                               : 0x1000,
    DEVICE_MAX_WORK_ITEM_DIMENSIONS           : 0x1003,
    DEVICE_MAX_WORK_GROUP_SIZE                : 0x1004,
    DEVICE_MAX_WORK_ITEM_SIZES                : 0x1005,
    DEVICE_PREFERRED_VECTOR_WIDTH_CHAR        : 0x1006,
    DEVICE_PREFERRED_VECTOR_WIDTH_SHORT       : 0x1007,
    DEVICE_PREFERRED_VECTOR_WIDTH_INT         : 0x1008,
    DEVICE_PREFERRED_VECTOR_WIDTH_LONG        : 0x1009,
    DEVICE_PREFERRED_VECTOR_WIDTH_FLOAT       : 0x100A,
    DEVICE_PREFERRED_VECTOR_WIDTH_DOUBLE      : 0x100B,
    DEVICE_ADDRESS_BITS                       : 0x100D,
    DEVICE_MAX_READ_IMAGE_ARGS                : 0x100E,
    DEVICE_MAX_WRITE_IMAGE_ARGS               : 0x100F,
    DEVICE_MAX_MEM_ALLOC_SIZE                 : 0x1010,
    DEVICE_IMAGE2D_MAX_WIDTH                  : 0x1011,
    DEVICE_IMAGE2D_MAX_HEIGHT                 : 0x1012,
    DEVICE_IMAGE_SUPPORT                      : 0x1016,
    DEVICE_MAX_PARAMETER_SIZE                 : 0x1017,
    DEVICE_MAX_SAMPLERS                       : 0x1018,
    DEVICE_MAX_CONSTANT_BUFFER_SIZE           : 0x1020,
    DEVICE_MAX_CONSTANT_ARGS                  : 0x1021,
    DEVICE_LOCAL_MEM_TYPE                     : 0x1022,
    DEVICE_LOCAL_MEM_SIZE                     : 0x1023,
    DEVICE_ENDIAN_LITTLE                      : 0x1026,
    DEVICE_AVAILABLE                          : 0x1027,
    DEVICE_QUEUE_PROPERTIES                   : 0x102A,
    DEVICE_PROFILE                            : 0x102E,
    DEVICE_VERSION                            : 0x102F,
    DEVICE_PLATFORM                           : 0x1031,
    DEVICE_PREFERRED_VECTOR_WIDTH_HALF        : 0x1034,
    DEVICE_HOST_UNIFIED_MEMORY                : 0x1035,
    DEVICE_OPENCL_C_VERSION                   : 0x103D,
  };

  var removedDeviceInfoEnums = {
    DEVICE_VENDOR_ID                         : 0x1001,
    DEVICE_IMAGE3D_MAX_WIDTH                 : 0x1013,
    DEVICE_IMAGE3D_MAX_HEIGHT                : 0x1014,
    DEVICE_IMAGE3D_MAX_DEPTH                 : 0x1015,
    DEVICE_MEM_BASE_ADDR_ALIGN               : 0x1019,
    DEVICE_MIN_DATA_TYPE_ALIGN_SIZE          : 0x101A,
    DEVICE_SINGLE_FP_CONFIG                  : 0x101B,
    DEVICE_GLOBAL_MEM_CACHE_TYPE             : 0x101C,
    DEVICE_GLOBAL_MEM_CACHELINE_SIZE         : 0x101D,
    DEVICE_GLOBAL_MEM_CACHE_SIZE             : 0x101E,
    DEVICE_GLOBAL_MEM_SIZE                   : 0x101F,
    DEVICE_MAX_CONSTANT_BUFFER_SIZE          : 0x1020,
    DEVICE_MAX_CONSTANT_ARGS                 : 0x1021,
    DEVICE_LOCAL_MEM_TYPE                    : 0x1022,
    DEVICE_LOCAL_MEM_SIZE                    : 0x1023,
    DEVICE_ERROR_CORRECTION_SUPPORT          : 0x1024,
    DEVICE_PROFILING_TIMER_RESOLUTION        : 0x1025,
    DEVICE_ENDIAN_LITTLE                     : 0x1026,
    DEVICE_COMPILER_AVAILABLE                : 0x1028,
    DEVICE_EXECUTION_CAPABILITIES            : 0x1029,
    DEVICE_QUEUE_PROPERTIES                  : 0x102A,
    DEVICE_NAME                              : 0x102B,
    DEVICE_VENDOR                            : 0x102C,
    DRIVER_VERSION                           : 0x102D,
    DEVICE_PROFILE                           : 0x102E,
    DEVICE_VERSION                           : 0x102F,
    DEVICE_EXTENSIONS                        : 0x1030,
    DEVICE_DOUBLE_FP_CONFIG                  : 0x1032,
    DEVICE_HALF_FP_CONFIG                    : 0x1033,
  };

});
