import assert from "node:assert/strict";
import { test } from "node:test";
import { bundleEligible, careNeeds, suggestHouse } from "../src/lib/care-needs.ts";

const conaseb = { id: "c", name: "Conaseb AntiFungal Pet Shampoo", highlights: ["Antifungal", "Skin & coat"], pet_type: "dog_cat", house: false };
const skinSyrup = { id: "s", name: "Aniamor Skin & Coat Syrup", highlights: ["Skin health", "Coat care"], pet_type: "dog_cat", house: true };
const jointTab = { id: "j", name: "Aniamor Joint Care Tablet", highlights: ["Joint health", "Mobility"], pet_type: "dog_cat", house: true };
const catFood = { id: "k", name: "Royal Canin Kitten", highlights: ["For kittens"], pet_type: "cat", house: false };
const dogTreat = { id: "r", name: "Robust Hearty Treats Skin & Coat Care", highlights: ["Glossy coat"], pet_type: "dog", house: true };

test("needs come from name and chips", () => {
  assert.deepEqual([...careNeeds(conaseb)], ["skin"]);
  assert.deepEqual([...careNeeds(jointTab)], ["joint"]);
});

test("medicated shampoo suggests the skin products, not the joint tablet", () => {
  const picks = suggestHouse([conaseb], [jointTab, skinSyrup, dogTreat]).map((p) => p.id);
  assert.deepEqual(picks.sort(), ["r", "s"]);
});

test("a cat-only product never suggests a dog-only product", () => {
  const catSkin = { ...conaseb, id: "cs", pet_type: "cat" };
  assert.deepEqual(suggestHouse([catSkin], [dogTreat]), []);
});

test("plain food pairs with that pet's everyday care, exact pet first", () => {
  const uteri = { id: "u", name: "Aniamor Uteri Care Tablet", highlights: ["Urinary health"], pet_type: "dog_cat", house: true };
  const kidney = { id: "kd", name: "Aniamor Kidney Care Tablet", highlights: ["Kidney support"], pet_type: "dog_cat", house: true };
  // Cat food: urinary / skin / digestion care, never joints or kidney medicine.
  const forCat = suggestHouse([catFood], [jointTab, kidney, uteri, skinSyrup]).map((p) => p.id);
  assert.deepEqual(forCat.sort(), ["s", "u"]);
  // Dog food: the dog-only Robust treat ranks above the dog-and-cat syrup for the same need.
  const dogFood = { id: "d", name: "Alps Chunky Lamb", highlights: null, pet_type: "dog", house: false };
  assert.equal(suggestHouse([dogFood], [skinSyrup, dogTreat])[0].id, "r");
});

test("bundle discount needs a matching non-own-brand partner in the cart", () => {
  assert.deepEqual([...bundleEligible([conaseb, skinSyrup, jointTab])], ["s"]);
  assert.deepEqual([...bundleEligible([skinSyrup, dogTreat])], []); // two own-brand items alone don't qualify
  assert.deepEqual([...bundleEligible([catFood, skinSyrup])], []); // no shared need
});
