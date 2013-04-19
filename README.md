# CL.js

**CL.js** is a lightweight utility library for **WebCL**.  It relieves
the developer from writing most of the boilerplate code that is
otherwise required to get anything running, while preserving the look
and feel of WebCL and providing easy access to the underlying raw API.

Please visit [http://webcl.nokiaresearch.com] for demos, tutorials,
and more information on WebCL.

## Example ##

To get started, we need to include CL.js from our HTML source:

    <script type="text/javascript" src="/path/to/CL.js"></script>

Now, let's initialize the global CL object and populate it with
information about the WebCL platforms and devices that are
available in this system:

    CL.setup({ debug: true });

With debug mode enabled, any exceptions will be reported on the
console together with helpful information about the function and
arguments that triggered the exception.  Next, let's create the CL
resources that we're going to need in this example:

    var src = CL.loadSource('kernels/random.cl');
    for (var d=0; d < CL.devices.length; d++) {
      var ctx = CL.createContext({ device: CL.devices[d], name: 'device'+d });
      var buffer1M = ctx.createBuffer({ size: 1024*1024, name: 'results' });
      var kernel = ctx.buildKernel({ source: src });
      kernel.setArgs(buffer1M);
      ctx.createCommandQueue({ name: 'theQueue' });
    }

Note that we assigned a plain-text `name` for each of our contexts,
buffers and queues. This makes it easy to find the resources that
we need later on. The Kernel object that we created for each
Context is assigned the same name as the kernel function in
`random.cl`.  For the purposes of this example, let's assume that
the kernel function is called `generateRandomNumbers`. Now, let's
proceed to run it on each Device in turn, reading back the results
into an ArrayBuffer:

    var randomNumbers = new Uint8Array(1024*1024);
    for (var d=0; d < CL.devices.length; d++) {
       var ctx = CL.getContext('device'+d);
       var queue = ctx.getQueue('theQueue');
       var kernel = ctx.getKernel('generateRandomNumbers');
       var buffer1M = ctx.getBuffer('results');
       queue.enqueueKernel(kernel, [randomNumbers.length]);
       queue.enqueueReadBuffer(buffer1M, randomNumbers);
       queue.finish();
       /* Do something with randomNumbers */
    }
