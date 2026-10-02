// Loads a restaurant's menu from Firestore: restaurants/{id}/menu/{categoryId}.
// Each category document holds { category, order, items: [...] } — the same shape the
// menu had in code, so rendering components are unchanged.
import { useEffect, useState } from "react";
import { collection, getDocs, orderBy, query } from "firebase/firestore";
import { db } from "../config/firebase";

export function useMenu(restaurantId) {
  const [menu, setMenu] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!restaurantId) return;
    let alive = true;
    setLoading(true);

    const load = async () => {
      try {
        const menuRef = collection(db, "restaurants", restaurantId, "menu");
        // Order categories by their `order` field; fall back gracefully if unset.
        let snap;
        try {
          snap = await getDocs(query(menuRef, orderBy("order")));
        } catch {
          snap = await getDocs(menuRef);
        }
        const categories = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
        if (alive) {
          setMenu(categories);
          setError(null);
        }
      } catch (err) {
        if (alive) setError(err.message);
      } finally {
        if (alive) setLoading(false);
      }
    };

    load();
    return () => {
      alive = false;
    };
  }, [restaurantId]);

  return { menu, loading, error };
}
