export type GeoapifyPlace = {
  id: string;
  name: string;
  address: string;
  categories: string[];
  latitude: number;
  longitude: number;
};

export type GeoapifyCoordinate = { latitude: number; longitude: number };

export type GeoapifyRouteStep = {
  instruction?: { text?: string };
  name?: string;
  distance?: number;
  time?: number;
};

export type GeoapifyRouteLeg = {
  steps?: GeoapifyRouteStep[];
  distance?: number;
  time?: number;
};

export type GeoapifyRouteFeature = {
  type: "Feature";
  geometry: {
    type: "LineString" | "MultiLineString";
    coordinates: number[][] | number[][][];
  };
  properties: {
    distance?: number;
    time?: number;
    legs?: GeoapifyRouteLeg[];
  };
};

export type GeoapifyRouteResult = {
  type: "FeatureCollection";
  features: GeoapifyRouteFeature[];
};
