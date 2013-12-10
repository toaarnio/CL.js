#pragma OPENCL EXTENSION all : disable

kernel void fp64(global uint* result, double d) 
{
  ulong dval = convert_ulong(as_ulong(d));

  result[0] = 0xffffffff; // assume error

  if (dval  == 0x3ff0000000000000) {
    result[0] = 0xdeadbeef;
  }
}
