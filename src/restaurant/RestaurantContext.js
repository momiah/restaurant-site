// Resolves WHICH restaurant this deployment is serving and loads its record once,
// then makes it (and its ordering rules) available to the whole app.
//
// Resolution order (first match wins), designed so onboarding is config, not code:
//   1. REACT_APP_RESTAURANT_ID   — explicit document id (single-tenant deploy / local dev)
//   2. REACT_APP_RESTAURANT_SLUG — explicit slug
//   3. domains/{hostname}        — hostname -> restaurantId map (custom domains)
//   4. slug === first hostname label (e.g. "taco-monster" from taco-monster.myplatform.com)
import React, { createContext, useContext, useEffect, useState } from "react";
import {
  doc,
  getDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
} from "firebase/firestore";
import { db } from "../config/firebase";

const RestaurantContext = createContext({
  restaurant: null,
  restaurantId: null,
  loading: true,
  error: null,
});

async function fetchById(id) {
  const snap = await getDoc(doc(db, "restaurants", id));
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}

async function fetchBySlug(slug) {
  const q = query(
    collection(db, "restaurants"),
    where("slug", "==", slug),
    limit(1)
  );
  const qs = await getDocs(q);
  if (qs.empty) return null;
  const d = qs.docs[0];
  return { id: d.id, ...d.data() };
}

async function resolveRestaurant() {
  const envId = process.env.REACT_APP_RESTAURANT_ID;
  if (envId) {
    const r = await fetchById(envId);
    if (r) return r;
    throw new Error(`No restaurant with id "${envId}" (REACT_APP_RESTAURANT_ID).`);
  }

  const envSlug = process.env.REACT_APP_RESTAURANT_SLUG;
  if (envSlug) {
    const r = await fetchBySlug(envSlug);
    if (r) return r;
    throw new Error(`No restaurant with slug "${envSlug}" (REACT_APP_RESTAURANT_SLUG).`);
  }

  const host =
    typeof window !== "undefined" ? window.location.hostname : "localhost";

  // Custom-domain lookup: domains/{hostname} -> { restaurantId }
  const domainSnap = await getDoc(doc(db, "domains", host));
  if (domainSnap.exists()) {
    const { restaurantId } = domainSnap.data();
    const r = restaurantId && (await fetchById(restaurantId));
    if (r) return r;
  }

  // Subdomain fallback: taco-monster.myplatform.com -> slug "taco-monster"
  const label = host.split(".")[0];
  const r = await fetchBySlug(label);
  if (r) return r;

  throw new Error(
    `Could not resolve a restaurant for host "${host}". Add a domains/${host} ` +
      `mapping, a restaurant with slug "${label}", or set REACT_APP_RESTAURANT_ID.`
  );
}

export function RestaurantProvider({ children }) {
  const [state, setState] = useState({
    restaurant: null,
    loading: true,
    error: null,
  });

  useEffect(() => {
    let alive = true;
    resolveRestaurant()
      .then((restaurant) => {
        if (alive) setState({ restaurant, loading: false, error: null });
      })
      .catch((err) => {
        if (alive)
          setState({ restaurant: null, loading: false, error: err.message });
      });
    return () => {
      alive = false;
    };
  }, []);

  return (
    <RestaurantContext.Provider
      value={{ ...state, restaurantId: state.restaurant?.id || null }}
    >
      {children}
    </RestaurantContext.Provider>
  );
}

export const useRestaurant = () => useContext(RestaurantContext);
