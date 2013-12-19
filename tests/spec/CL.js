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
 * Author: Tomi Aarnio, 2013
 */

// Uncomment the following line to enable the "fail fast" mode.
//jasmine.getEnv().failFast();

var SELECTED_DEVICE = CL.DEVICES[2];

//////////////////////////////////////////////////////////////////////////////
//
//
// 
describe("CL", function() {
  
  beforeEach(function() {
    this.addMatchers({
      toEvalAs: function(result) {
        return eval(this.actual) === eval(result);
      },
      toFail: function() {
        var wrapper = new Function(this.actual);
        try { wrapper() } catch(e) { return true; }
        return false;
      },
      toReturn: function(result) {
        var wrapper = new Function(this.actual);
        return wrapper() === result;
      },
    });
  });

  beforeEach(function() {
    cl1 = new CL({ debug: false, cleanup: true });
    cl2 = new CL({ debug: false, cleanup: true });
    cl = cl1;
  });

  afterEach(function() {
    cl1.releaseAll();
    cl2.releaseAll();
    delete cl1;
    delete cl2;
  });

  it("must contain the WebCL enums", function() {
    expect('CL.PLATFORM_VENDOR').toEvalAs('WebCL.PLATFORM_VENDOR');
    expect('CL.INVALID_ARG_SIZE').toEvalAs('WebCL.INVALID_ARG_SIZE');
  });

  it("instances must have a unique ID", function() {
    expect('cl1.ID').not.toEvalAs('cl2.ID');
  });

  it("instances must have isolated properties", function() {
    cl1.foo = 'bar';
    cl2.foo = 'baz';
    expect(cl1.foo).toEqual('bar');
    expect(cl2.foo).toEqual('baz');
    expect(cl1.foo).not.toEqual(cl2.foo);
  });

  it("must contain at least one Device", function() {
    expect(CL.DEVICES.length).toBeGreaterThan(0);
  });

  it("must be able to create a Context on the default Device", function() {
    ctx1 = cl.createContext();
    expect('ctx1 instanceof WebCLContext').toEvalAs(true);
  });

  it("must be able to create a Context on the selected Device", function() {
    ctx1 = cl.createContext({ devices: [CL.DEVICES[0]] });
    expect('ctx1 instanceof WebCLContext').toEvalAs(true);
  });

  it("must be able to create a Context on any Platform", function() {
    CL.PLATFORMS.forEach(function(plat) {
      var ctx = cl.createContext({ platform: plat });
      expect(ctx instanceof WebCLContext).toBeTruthy();
      ctx.release;
    });
  });

  it("must be able to create a Context on any Device", function() {
    CL.DEVICES.forEach(function(dev) {
      var ctx = cl.createContext({ devices: [dev] });
      expect(ctx instanceof WebCLContext).toBeTruthy();
      ctx.release();
    });
  });

  it("must be able to retrieve a Context by name", function() {
    ctx1 = cl.createContext();
    ctx1.name = 'foo';
    ctx2 = cl.getContext('foo');
    ctx3 = cl.getContext('bar');
    expect('ctx1').toEvalAs('ctx2');
    expect('ctx3').toEvalAs(null);
  });

  it("instances must have isolated Contexts", function() {
    cl1.createContext({ name: 'foo' });
    cl2.createContext({ name: 'foo' });
    expect("cl1.getContext('foo')").not.toEvalAs("cl2.getContext('foo')");
  });

  it("must throw an exception on invalid input", function() {
    expect(function() { cl.createContext({ device: 'foo' }) }).toThrow();
  });

  //////////////////////////////////////////////////////////////////////////////
  //
  // CL.loadSource
  // 
  describe("loadSource", function() {

    it("must work in synchronous mode", function() {
      var src = CL.loadSource('kernels/rng.cl');
      expect(src && src.length).toBeGreaterThan(0);
    });
    
    it("must work in asynchronous mode", function() {
      var done = false;
      runs(function() {
        var ok = CL.loadSource('kernels/rng.cl', function(src) {
          expect(src && src.length).toBeGreaterThan(0);
          done = true;
        });
        expect(ok).toEqual(true);
      });
      waitsFor(function() { return done; }, "http request to complete", 100);
    });

    it("must throw if there is any failure in synchronous mode", function() {
      expect('CL.loadSource()').toFail();
      expect('CL.loadSource("")').toFail();
      expect('CL.loadSource(null)').toFail();
      expect('CL.loadSource("invalidURI")').toFail();
      expect('CL.loadSource("validButDoesNotExist.cl")').toFail();
    });

    it("must throw immediately if the URI is invalid in asynchronous mode", function() {
      callback = function() {};
      expect('CL.loadSource("", callback)').toFail();
      expect('CL.loadSource(null, callback)').toFail();
      expect('CL.loadSource("invalidURI", callback)').toFail();
    });

    it("must return null if http request fails in asynchronous mode", function() {
      var done = false;
      runs(function() { 
        CL.loadSource('validButDoesNotExist.cl', function(src) {
          expect(src).toBeNull();
          done = true;
        });
      });
      waitsFor(function() { return done }, "http request to fail", 100);
    });

  });
  
  //////////////////////////////////////////////////////////////////////////////
  //
  // Context
  // 
  describe("WebCLContext", function() {

    beforeEach(function() {
      ctx = cl.createContext({ device: SELECTED_DEVICE });
    });

    afterEach(function() {
      ctx.release();
    });

    it("must be able to create a CommandQueue", function() {
      var queue = ctx.createCommandQueue();
      expect(queue instanceof WebCLCommandQueue).toBeTruthy();
      queue.release();
    });

    it("must be able to create two Buffers", function() {
      var buffer1M = ctx.createBuffer({ size: 1*1024*1024 });
      var buffer2M = ctx.createBuffer({ size: 2*1024*1024 });
      expect(buffer1M instanceof WebCLMemoryObject).toBeTruthy();
      expect(buffer2M instanceof WebCLMemoryObject).toBeTruthy();
      buffer1M.release();
      buffer2M.release();
    });

    it("must be able to create a Program from source string", function() {
      var uri = 'kernels/rng.cl';
      source = CL.loadSource(uri);
      expect('ctx.createProgram(source) instanceof WebCLProgram').toEvalAs(true);
      expect('ctx.createProgram({ source: source }) instanceof WebCLProgram').toEvalAs(true);
    });

    it("must be able to create a Program from URI", function() {
      uri = 'kernels/rng.cl';
      expect('ctx.createProgram(uri) instanceof WebCLProgram').toEvalAs(true);
      expect('ctx.createProgram({ uri: uri }) instanceof WebCLProgram').toEvalAs(true);
    });

    it("must have separate resources on each instance", function() {
      var ctx1 = cl.createContext({ name: 'one' });
      var ctx2 = cl.createContext({ name: 'two' });
      var buffer1 = ctx1.createBuffer({ size: 1024, name: 'b1' });
      var buffer2 = ctx2.createBuffer({ size: 2048, name: 'b2' });
      expect(ctx1.buffers.length).toBe(1);
      expect(ctx2.buffers.length).toBe(1);
    });

    it("must be able to read and write Buffers", function() {
      var input = new Float32Array(512);
      input[12] = 3.14159;
      var output = new Float32Array(512);
      var queue = ctx.createCommandQueue();
      var buffer1 = ctx.createBuffer({ size: 1024*1024 });
      var buffer2 = ctx.createBuffer({ size: 1024*1024 });
      function execute() {
        queue.enqueueWriteBuffer(buffer1, input);
        queue.enqueueReadBuffer(buffer1, output);
        queue.finish();
        for (var i=0; i < input.length; i++) {
          if (input[i] !== output[i]) {
            console.log("output[i] = ", output[i]);
            throw "input[i] !== output[i] for i="+i;
          }
        }
      }
      expect(execute).not.toThrow();
      buffer2.release();
      buffer1.release();
      queue.release();
    });

    it("must throw on invalid input", function() {
      expect('ctx.createProgram({ source: null })').toFail();
      expect('ctx.createProgram({ uri: null })').toFail();
      expect('ctx.createProgram({ uri: "foo.cl" })').toFail();
      expect('ctx.createProgram("foo.cl")').toFail();
      expect('ctx.createProgram(null)').toFail();
      expect('ctx.createProgram(0xdeadbeef)').toFail();
      expect('ctx.createProgram({})').toFail();
      expect('ctx.createProgram()').toFail();
    });
  });

  //////////////////////////////////////////////////////////////////////////////
  //
  //
  // 
  describe("WebCLProgram", function() {

    beforeEach(function() {
      ctx = cl.createContext({ device: SELECTED_DEVICE });
    });

    afterEach(function() {
      ctx.release();
    });

    it("must be able to build a Program", function() {
      program = ctx.createProgram('kernels/sobel.cl').build();
      expect('program instanceof WebCLProgram').toEvalAs(true);
    });

    it("must be able to build a Program with compiler options", function() {
      program = ctx.createProgram('kernels/sobel.cl');
      program.build({ opts: '-cl-fast-relaxed-math' });
      expect('program instanceof WebCLProgram').toEvalAs(true);
    });

    it("must be able to pass '-D' defines to the compiler", function() {
      program = ctx.createProgram('kernels/defines.cl');
      program.build({ defs: { FOO: true, BAR: 'baz' }});
      expect('program instanceof WebCLProgram').toEvalAs(true);
    });

    it("must be able to create a Kernel", function() {
      program = ctx.createProgram('kernels/sobel.cl').build();
      kernel = program.getKernel('clSobel');
      expect('kernel instanceof WebCLKernel').toEvalAs(true);
    });

    it("must be able to create a bunch of complex Kernels from a single source file", function() {
      program = ctx.createProgram('kernels/scan_kernel.cl').build();
      expect('program instanceof WebCLProgram').toEvalAs(true);
      expect('program.getKernels().length').toEvalAs(5);
    });

    //////////////////////////////////////////////////////////////////////////////
    //
    //
    // 
    describe("WebCLKernel", function() {

      it("must be able to run a Kernel", function() {
        var results = new Float32Array(512);
        var src = CL.loadSource('kernels/enqueueReadBuffer.cl');
        var program = ctx.createProgram({ source: src });
        program.build({ opts: "-Werror" });
        var kernel = program.getKernel();
        var queue = ctx.createCommandQueue();
        var buffer1M = ctx.createBuffer({ size: 1024*1024 });
        function execute() {
          kernel.setArgs(buffer1M);
          queue.enqueueKernel(kernel, results.length);
          queue.finish();
        }
        expect(execute).not.toThrow();
      });

      it("must support all kernel argument scalar types", function() {
        var result = new Uint32Array([0xbabecafe]);
        var c = new Int8Array([-1]);
        var s = new Int16Array([-1]);
        var i = new Int32Array([-1]);
        var l = new Int32Array([-1, 0]);
        var uc = new Uint8Array([0xff]);
        var us = new Uint16Array([0xffff]);
        var ui = new Uint32Array([0xffffffff]);
        var ul = new Uint32Array([0xffffffff, 0]);
        var f32 = new Float32Array([1.0]);
        var src = CL.loadSource('kernels/argtypes.cl');
        var program = ctx.createProgram({ source: src });
        program.build({ opts: "-Werror" });
        var kernel = program.getKernel('scalars');
        var queue = ctx.createCommandQueue();
        var resbuf = ctx.createBuffer({ size: result.byteLength });
        function execute() {
          kernel.setArgs(resbuf, c, s, i, l, uc, us, ui, ul, f32);
          queue.enqueueKernel(kernel, 1);
          queue.enqueueReadBuffer(resbuf, result);
          queue.finish();
        }
        expect(execute).not.toThrow();
        expect(result[0]).toEqual(0xdeadbeef);
      });

      it("must support all kernel argument vector types", function() {
        var result = new Uint32Array([0xbabecafe]);
        var c = new Int8Array([-1, -1, -1, -1]);
        var s = new Int16Array([-1, -1, -1, -1]);
        var i = new Int32Array([-1, -1, -1, -1]);
        var l = new Int32Array([-1, 0, -1, 0, -1, 0, -1, ]);
        var uc = new Uint8Array([0xff, 0xff, 0xff, 0xff]);
        var us = new Uint16Array([0xffff, 0xffff, 0xffff, 0xffff]);
        var ui = new Uint32Array([0xffffffff, 0xffffffff, 0xffffffff, 0xffffffff]);
        var ul = new Uint32Array([0xffffffff, 0, 0xffffffff, 0, 0xffffffff, 0, 0xffffffff, 0]);
        var f32 = new Float32Array([1.0, 1.0, 1.0, 1.0]);
        var src = CL.loadSource('kernels/argtypes.cl');
        var program = ctx.createProgram({ source: src });
        program.build({ opts: "-Werror" });
        var kernel = program.getKernel('vectors');
        var queue = ctx.createCommandQueue();
        var resbuf = ctx.createBuffer({ size: result.byteLength });
        function execute() {
          kernel.setArgs(resbuf, c, s, i, uc, us, ui, f32);
          queue.enqueueKernel(kernel, 1);
          queue.enqueueReadBuffer(resbuf, result);
          queue.finish();
        }
        expect(execute).not.toThrow();
        expect(result[0]).toEqual(0xdeadbeef);
      });
    });

    //////////////////////////////////////////////////////////////////////////////
    //
    //
    // 
    describe("Undocumented Features", function() {

      it("can get Program binary sizes", function() {
        var program = ctx.createProgram('kernels/sobel.cl').build();
	      var sizes = program.getInfo(CL.PROGRAM_BINARY_SIZES);
        expect(sizes[0]).toBeGreaterThan(0);
      });

      it("can get Program binaries", function() {
        var program = ctx.createProgram('kernels/sobel.cl').build();
        var binaries = program.getInfo(CL.PROGRAM_BINARIES);
        expect(binaries[0].length).toBeGreaterThan(0);
      });

      if (SELECTED_DEVICE.vendor.startsWith("NVIDIA") || SELECTED_DEVICE.platform.vendor.startsWith("NVIDIA")) {
        it("can build kernels from PTX source on NVIDIA GPUs", function() {
          var uri = 'kernels/synthetic_case.O3.sm_21.ptx?ext=.cl';
          var src = CL.loadSource(uri);
          expect(src.length).toBeGreaterThan(0);
          prog = ctx.createProgram({ ptx: src }).build();
          expect('prog instanceof WebCLProgram').toEvalAs(true);
          expect('prog.getKernels() instanceof Array').toEvalAs(true);
          expect('prog.getKernel() instanceof WebCLKernel').toEvalAs(true);
        });
      }

    });

  });

  //////////////////////////////////////////////////////////////////////////////
  //
  //
  // 
  describe("Extensions", function() {

    function enableExtension(name) {
      var deviceExtensions = SELECTED_DEVICE.getInfo(CL.DEVICE_EXTENSIONS);
      var platformExtensions = SELECTED_DEVICE.platform.getInfo(CL.PLATFORM_EXTENSIONS);
      var found = (deviceExtensions.indexOf(name) >= 0 || platformExtensions.indexOf(name) >= 0);
      return found;
    }

    beforeEach(function() {
      ctx = cl.createContext({ device: SELECTED_DEVICE });
    });

    afterEach(function() {
      ctx.release();
    });

    describe("KHR_fp64", function() {
      it("must throw if disabled by #pragma", function() {
        program = ctx.createProgram('kernels/fp64_disabled.cl');
        expect('program.build()').toFail();
      });

      it("must throw if not enabled by #pragma", function() {
        program = ctx.createProgram('kernels/fp64_default.cl');
        expect('program.build()').toFail();
      });

      it("must throw if not enabled by #pragma, even if enabled in host code", function() {
        if (enableExtension("khr_fp64")) {
          program = ctx.createProgram('kernels/fp64_default.cl');
          expect('program.build()').toFail();
        }
      });

      it("must throw if enabled by #pragma, but not enabled in host code", function() {
        program = ctx.createProgram('kernels/fp64_enabled.cl');
        expect('program.build()').toFail();
      });

      it("must not throw if enabled by #pragma and in host code", function() {
        if (enableExtension("khr_fp64")) {
          program = ctx.createProgram('kernels/fp64_enabled.cl');
          expect('program.build()').not.toFail();
        }
      });

      it("must support 'double' as kernel argument type", function() {
        if (enableExtension("khr_fp64")) {
          var result = new Uint32Array([0xbabecafe]);
          var f64 = new Float64Array([1.0]);
          function execute() {
            var program = ctx.createProgram('kernels/fp64_enabled.cl');
            var kernel = program.build().getKernel('fp64');
            var queue = ctx.createCommandQueue();
            var resbuf = ctx.createBuffer({ size: result.byteLength });
            kernel.setArgs(resbuf, f64);
            queue.enqueueKernel(kernel, 1);
            queue.enqueueReadBuffer(resbuf, result);
            queue.finish();
          }
          expect(execute).not.toThrow();
          expect(result[0]).toEqual(0xdeadbeef);
        }
      });
    });

    describe("KHR_printf", function() {
      it("must throw if not enabled by #pragma", function() {
        program = ctx.createProgram('kernels/printf.cl');
        expect('program.build()').toFail();
      });
    });

  });

});

//////////////////////////////////////////////////////////////////////////////
//
//
// 
describe("Performance", function() {

  beforeEach(function() {
    cl = new CL({ debug: false, cleanup: true });
    ctx = cl.createContext({ device: SELECTED_DEVICE });
  });

  afterEach(function() {
    ctx.release();
    cl.releaseAll();
    delete cl;
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
      buffer = ctx.createBuffer({ size: BUFFERSIZE, name: 'buffer16M' });
      program = ctx.createProgram('kernels/builtin-math.cl').build();
      queue = ctx.createCommandQueue();
    });

    afterEach(function() {
      ctx.releaseAll();
    });
    
    it("hypot() should be faster than a custom implementation", function() {
      var faster = program.getKernel('hypotBuiltin');
      var slower = program.getKernel('hypotCustom');
      faster.setArgs('buffer16M');
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
      var faster = program.getKernel('sinCosCombined');
      var slower = program.getKernel('sinCosSeparate');
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

        var srcMemProtectOn = CL.loadSource('kernels/rng2.safe.cl');
        var memProtectOn = ctx.createProgram({ source: srcMemProtectOn }).build().getKernel();
        var buffer16M = ctx.createBuffer({ size: BUFFERSIZE });
        var queue = ctx.createCommandQueue();
        memProtectOn.setArgs(buffer16M, new Uint32Array([WORKSIZE, 0]), new Uint32Array([0xdeadbeef]));
        var msProtected = exec(memProtectOn, WORKSIZE, 5).msec;
        var slowdown = (msJavaScript / msProtected).toFixed(2);
        console.log(ctx.device.version, "-- speedup compared to JavaScript:", slowdown, "(", msProtected, "vs.", msJavaScript, ")");
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
        var srcMemProtectOff = CL.loadSource('kernels/rng2.cl');
        var srcMemProtectOn = CL.loadSource('kernels/rng2.safe.cl');
        var memProtectOff = ctx.createProgram(srcMemProtectOff).build().getKernel();
        var memProtectOn = ctx.createProgram(srcMemProtectOn).build().getKernel();
        var buffer16M = ctx.createBuffer({ size: 16*1024*1024 });
        var queue = ctx.createCommandQueue();
        var BUFFERSIZE = buffer16M.size / 4;
        var WORKSIZE = BUFFERSIZE;
        memProtectOff.setArgs(buffer16M, new Uint32Array([0xdeadbeef]));
        memProtectOn.setArgs(buffer16M, new Uint32Array([BUFFERSIZE, 0]), new Uint32Array([0xdeadbeef]));
        var msUnprotected = exec(memProtectOff, WORKSIZE, 5).msec;
        var msProtected = exec(memProtectOn, WORKSIZE, 5).msec;
        var slowdown = (msProtected / msUnprotected).toFixed(2);
        console.log(ctx.device.version, "-- slowdown from memory protection:", slowdown, "(original ", msUnprotected, "vs. protected", msProtected, ")");
        expect(slowdown).toBeLessThan(5.0);
      });

      it("should be faster using uint4 than uint[4]", function() {
        var src1 = CL.loadSource('kernels/rng.cl');
        var src2 = CL.loadSource('kernels/rng2.cl');
        var src1s = CL.loadSource('kernels/rng.safe.cl');
        var src2s = CL.loadSource('kernels/rng2.safe.cl');
        var kernel1 = ctx.createProgram(src1).build().getKernel();
        var kernel2 = ctx.createProgram(src2).build().getKernel();
        var kernel1s = ctx.createProgram(src1s).build().getKernel();
        var kernel2s = ctx.createProgram(src2s).build().getKernel();
        var buffer16M = ctx.createBuffer({ size: 16*1024*1024 });
        var queue = ctx.createCommandQueue();
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
        console.log(ctx.device.version);
        console.log("  array unsafe :", msKernel1);
        console.log("  array safe   :", msKernel1s);
        console.log("  vector unsafe:", msKernel2);
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
      var srcMemProtectOff = CL.loadSource('kernels/complete_transformation.cl');
      var srcMemProtectOn = CL.loadSource('kernels/complete_transformation.safe.cl');
      var memProtectOff = ctx.createProgram(srcMemProtectOff).build().getKernel();
      var memProtectOn = ctx.createProgram(srcMemProtectOn).build().getKernel();
      var WORKSIZE = 1024*1024
      var GROUPSIZE = Math.max(memProtectOn.workGroupSize, memProtectOff.workGroupSize);
      var bufferInput = ctx.createBuffer({ size: 16*WORKSIZE });    // sizeof(float4)=16
      var bufferOutput = ctx.createBuffer({ size: 16*WORKSIZE });
      var bufferConst = ctx.createBuffer({ flags: CL.MEM_READ_ONLY, size: 16*WORKSIZE });
      var queue = ctx.createCommandQueue();
      memProtectOff.setArgs(bufferInput, bufferOutput, bufferConst, new Uint32Array([GROUPSIZE*16]));
      memProtectOn.setArgs(bufferInput, new Uint32Array([WORKSIZE, 0]),
                           bufferOutput, new Uint32Array([WORKSIZE, 0]),
                           bufferConst, new Uint32Array([WORKSIZE, 0]),
                           new Uint32Array([GROUPSIZE*16]), new Uint32Array([GROUPSIZE, 0]));

      var msUnprotected = exec(memProtectOff, WORKSIZE).msec;
      var msProtected = exec(memProtectOn, WORKSIZE).msec;
      var slowdown = (msProtected / (msUnprotected || 1.0)).toFixed(2);
      console.log(ctx.device.version, "-- slowdown from memory protection:", slowdown, "(", msUnprotected, "vs.", msProtected, ")");
      expect(slowdown).toBeLessThan(5.0);
    });

    it("should have less than 2x overhead in Benchmark #3 (NVIDIA PTX only)", function() {
      var srcOriginal = CL.loadSource('kernels/synthetic_case.O3.sm_21.ptx?foo.cl');
      var srcProtected = CL.loadSource('kernels/synthetic_case.O3.clamped.O3.sm_21.ptx?foo.cl');
      if (ctx.device.platform.vendor.indexOf("NVIDIA") >= 0 || ctx.device.vendor.indexOf("NVIDIA") >= 0) {
        var defs = { KERNEL_LOOP_COUNT : 64, PRIVATE_BUFFER_SIZE : 128 };
        var kernelOriginal = ctx.createProgram({ ptx: srcOriginal }).build().getKernel();
        var kernelProtected = ctx.createProgram({ ptx: srcProtected }).build().getKernel();
        var buffer = ctx.createBuffer({ size: 16*1024*1024 });
        var queue = ctx.createCommandQueue();
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

