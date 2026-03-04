"use client";

import { Warp } from "@paper-design/shaders-react";

export default function WarpShaderBackground() {
  return (
    <div
      style={{
        position: "absolute",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
      }}
    >
      <Warp
        style={{ height: "100%", width: "100%" }}
        proportion={0.42}
        softness={1.2}
        distortion={0.18}
        swirl={0.6}
        swirlIterations={12}
        shape="checks"
        shapeScale={0.08}
        scale={1}
        rotation={0}
        speed={0.6}
        colors={[
          "hsl(220, 60%, 8%)",
          "hsl(195, 80%, 18%)",
          "hsl(210, 40%, 14%)",
          "hsl(185, 60%, 22%)",
        ]}
      />
    </div>
  );
}
