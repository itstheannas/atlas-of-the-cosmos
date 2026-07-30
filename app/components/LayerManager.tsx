"use client";

import { cosmicScaleLayers, explorerLayers } from "../../lib/cosmos-data";
import type { UiCopy } from "../../lib/i18n";
import { cssVars } from "./css-vars";

interface LayerManagerProps {
  readonly copy: UiCopy;
  readonly currentScaleLayerId: string;
  readonly open: boolean;
  readonly visibleLayerIds: ReadonlySet<string>;
  readonly onClose: () => void;
  readonly onToggle: (layerId: string) => void;
}

const layerGroups = [
  ["solar-system", "solarSystem"],
  ["stellar", "stellar"],
  ["deep-sky", "deepSky"],
  ["galactic", "galactic"],
  ["cosmological", "cosmological"],
  ["reference", "reference"],
  ["education", "education"],
] as const;

export function LayerManager({
  copy,
  currentScaleLayerId,
  open,
  visibleLayerIds,
  onClose,
  onToggle,
}: LayerManagerProps) {
  const orderByScaleId = new Map(
    cosmicScaleLayers.map((layer) => [layer.id, layer.order]),
  );
  const currentScaleOrder = orderByScaleId.get(currentScaleLayerId) ?? 0;

  return (
    <aside
      className={`layer-manager ${open ? "is-open" : ""}`}
      aria-labelledby="layer-manager-title"
      aria-hidden={!open}
      inert={!open}
    >
      <div className="drawer-heading">
        <div>
          <p className="eyebrow">{copy.layerManager.eyebrow}</p>
          <h2 id="layer-manager-title">{copy.layers}</h2>
        </div>
        <button
          type="button"
          className="icon-button"
          aria-label={copy.close}
          onClick={onClose}
        >
          ×
        </button>
      </div>
      <p className="panel-intro">{copy.layerManager.intro}</p>
      <div className="layer-groups">
        {layerGroups.map(([groupId, copyKey]) => {
          const layers = explorerLayers.filter(
            (layer) => layer.group === groupId,
          );
          return layers.length > 0 ? (
            <section key={groupId}>
              <h3>{copy.layerManager.groups[copyKey]}</h3>
              {layers.map((layer) => {
                const minimum =
                  orderByScaleId.get(layer.minimumScaleLayerId) ??
                  Number.NEGATIVE_INFINITY;
                const maximum =
                  orderByScaleId.get(layer.maximumScaleLayerId) ??
                  Number.POSITIVE_INFINITY;
                const activeAtCurrentScale =
                  currentScaleOrder >= minimum && currentScaleOrder <= maximum;
                return (
                  <label
                    className={`layer-toggle ${
                      activeAtCurrentScale ? "" : "is-out-of-scale"
                    }`}
                    key={layer.id}
                  >
                    <input
                      type="checkbox"
                      checked={visibleLayerIds.has(layer.id)}
                      onChange={() => onToggle(layer.id)}
                    />
                    <span
                      className="toggle-visual"
                      style={cssVars({ "--layer-colour": layer.colour })}
                      aria-hidden="true"
                    />
                    <span>
                      <strong>{layer.label}</strong>
                      <small>{layer.description}</small>
                      <em className={`data-mode-${layer.dataMode}`}>
                        {copy.layerManager.dataModes[layer.dataMode]}
                      </em>
                      {activeAtCurrentScale ? null : (
                        <em className="scale-status">
                          {copy.layerManager.outsideScale}
                        </em>
                      )}
                    </span>
                  </label>
                );
              })}
            </section>
          ) : null;
        })}
      </div>
    </aside>
  );
}
