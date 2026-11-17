import { useCallback, useEffect, useRef, useState } from "react";
import { apiRequest } from "../utils/api.js";

const LOCK_POLL_INTERVAL_MS = 2000;
const LOCK_RENEW_INTERVAL_MS = 30_000;

function lockPath(action) {
  return `/api/edit-locks/${action}`;
}

function lockBody(resource) {
  return JSON.stringify({
    resourceType: resource.resourceType,
    resourceId: resource.resourceId,
  });
}

export function useEditLock({ releaseOnUnmount = true } = {}) {
  const [activeResource, setActiveResource] = useState(null);
  const [blockedResource, setBlockedResource] = useState(null);
  const activeResourceRef = useRef(null);
  const lastRenewedAtRef = useRef(0);

  const release = useCallback(async () => {
    const resource = activeResourceRef.current;
    if (!resource) return;
    activeResourceRef.current = null;
    setActiveResource(null);
    try {
      await apiRequest(lockPath("release"), {
        method: "POST",
        body: lockBody(resource),
      });
    } catch (error) {
      console.error("Edit lock release failed:", error);
      throw error;
    }
  }, []);

  const acquire = useCallback(async (resourceType, resourceId) => {
    const resource = { resourceType, resourceId: String(resourceId) };
    const current = activeResourceRef.current;
    if (current && (
      current.resourceType !== resource.resourceType
      || current.resourceId !== resource.resourceId
    )) {
      await release();
    }

    try {
      await apiRequest(lockPath("acquire"), {
        method: "POST",
        body: lockBody(resource),
      });
      activeResourceRef.current = resource;
      lastRenewedAtRef.current = Date.now();
      setActiveResource(resource);
      setBlockedResource(null);
      return true;
    } catch (error) {
      if (error.status === 423) {
        if (
          activeResourceRef.current?.resourceType === resource.resourceType
          && activeResourceRef.current.resourceId === resource.resourceId
        ) {
          activeResourceRef.current = null;
          setActiveResource(null);
        }
        setBlockedResource(resource);
        return false;
      }
      throw error;
    }
  }, [release]);

  useEffect(() => {
    if (!blockedResource) return undefined;
    let active = true;
    const checkLock = async () => {
      try {
        const params = new URLSearchParams({
          resourceType: blockedResource.resourceType,
          resourceId: blockedResource.resourceId,
        });
        const status = await apiRequest(`${lockPath("status")}?${params}`);
        if (active && !status.locked) setBlockedResource(null);
      } catch (error) {
        console.error("Edit lock status check failed:", error);
      }
    };

    checkLock();
    const timer = window.setInterval(checkLock, LOCK_POLL_INTERVAL_MS);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [blockedResource]);

  useEffect(() => {
    if (!activeResource) return undefined;
    let active = true;
    const renewIfActive = async () => {
      if (Date.now() - lastRenewedAtRef.current < LOCK_RENEW_INTERVAL_MS) return;
      lastRenewedAtRef.current = Date.now();
      try {
        await apiRequest(lockPath("renew"), {
          method: "POST",
          body: lockBody(activeResource),
        });
      } catch (error) {
        if (active && error.status === 409) {
          activeResourceRef.current = null;
          setActiveResource(null);
          setBlockedResource(activeResource);
        } else {
          console.error("Edit lock renewal failed:", error);
        }
      }
    };
    const handleActivity = () => {
      if (Date.now() - lastRenewedAtRef.current >= LOCK_RENEW_INTERVAL_MS) {
        renewIfActive();
      }
    };
    const events = ["pointerdown", "keydown", "input", "touchstart"];
    events.forEach((eventName) => {
      window.addEventListener(eventName, handleActivity, true);
    });

    return () => {
      active = false;
      events.forEach((eventName) => {
        window.removeEventListener(eventName, handleActivity, true);
      });
    };
  }, [activeResource]);

  useEffect(() => () => {
    if (!releaseOnUnmount) return;
    const resource = activeResourceRef.current;
    if (!resource) return;
    apiRequest(lockPath("release"), {
      method: "POST",
      body: lockBody(resource),
    }).catch((error) => console.error("Edit lock cleanup failed:", error));
  }, [releaseOnUnmount]);

  const isBlocked = useCallback((resourceType, resourceId) => (
    blockedResource?.resourceType === resourceType
    && blockedResource.resourceId === String(resourceId)
  ), [blockedResource]);

  return { acquire, release, isBlocked, activeResource, blockedResource };
}
