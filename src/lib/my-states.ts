// ISO 3166-2:MY subdivision codes, keyed by the state names used across the site.
export const MY_STATE_CODES: Record<string, string> = {
  Johor: "MY-01",
  Kedah: "MY-02",
  Kelantan: "MY-03",
  Melaka: "MY-04",
  "Negeri Sembilan": "MY-05",
  Pahang: "MY-06",
  "Pulau Pinang": "MY-07",
  Penang: "MY-07",
  Perak: "MY-08",
  Perlis: "MY-09",
  Selangor: "MY-10",
  Terengganu: "MY-11",
  Sabah: "MY-12",
  Sarawak: "MY-13",
  "Kuala Lumpur": "MY-14",
  Labuan: "MY-15",
  Putrajaya: "MY-16",
};

export const MY_STATES = Object.keys(MY_STATE_CODES).filter((s) => s !== "Penang");
