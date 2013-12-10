kernel void usePrintf(global uint* result) 
{
  printf("Hello, world!\n");
  result[0] = 0xdeadbeef;
}
