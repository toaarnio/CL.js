//#pragma OPENCL EXTENSION cl_khr_fp64 : enable

kernel void enqueueReadBuffer(global float* outputValueArray) {
  int gid = get_global_id(0);
  if (gid % 2 == 0) {
    outputValueArray[gid] = 1.0f;
  }
}
