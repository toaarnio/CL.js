kernel void hypotBuiltin(global float* buf) {
  uint gid = get_global_id(0);
  float x = (float)gid / get_global_size(0);
  float y = (float)(gid+1) / get_global_size(0);
  for (int i=0; i < 10; i++) {
    x += hypot(x, y);
  }
  buf[gid] = hypot(x, y);
}

kernel void hypotCustom(global float* buf) {
  uint gid = get_global_id(0);
  float x = (float)gid / get_global_size(0);
  float y = (float)(gid+1) / get_global_size(0);
  for (int i=0; i < 10; i++) {
    x += sqrt(x*x + y*y);
  }
  buf[gid] = sqrt(x*x + y*y);
}

kernel void sinCosSeparate(global float* buf) {
 uint gid = get_global_id(0);
 float x = (float) gid / get_global_size(0);
 float y = 0.0f;
 for (int i=0; i < 10; i++) {
   y += cos(x);
   x += sin(x);
 }
 buf[gid] = x+y;
}

kernel void sinCosCombined(global float* buf) {
 uint gid = get_global_id(0);
 float x = (float) gid / get_global_size(0);
 float y = 0.0f;
 float tmp = 0.0f;
 for (int i=0; i < 10; i++) {
   x += sincos(x, &tmp);
   y += tmp;
 }
 buf[gid] = x+y;
}
