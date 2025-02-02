import { Fragment, h } from "preact";
import { useMemo, useState } from "preact/hooks";
import { Vendor } from "@iabtechlabtcf/core";
import {
  GvlDataCategories,
  GvlDataDeclarations,
  VendorRecord,
  EmbeddedPurpose,
  LegalBasisEnum,
} from "../../lib/tcf/types";
import { PrivacyExperience } from "../../lib/consent-types";
import { UpdateEnabledIds } from "./TcfOverlay";
import {
  transformExperienceToVendorRecords,
  vendorGvlEntry,
} from "../../lib/tcf/vendors";
import ExternalLink from "../ExternalLink";
import RecordsList from "./RecordsList";
import { LEGAL_BASIS_OPTIONS } from "../../lib/tcf/constants";
import RadioGroup from "./RadioGroup";
import PagingButtons, { usePaging } from "../PagingButtons";

const VendorDetails = ({
  label,
  lineItems,
}: {
  label: string;
  lineItems: EmbeddedPurpose[] | undefined;
}) => {
  if (!lineItems || lineItems.length === 0) {
    return null;
  }

  const hasRetentionInfo = lineItems.some((li) => li.retention_period != null);

  return (
    <table className="fides-vendor-details-table">
      <thead>
        <tr>
          <th width="80%">{label}</th>
          {hasRetentionInfo ? (
            <th width="20%" style={{ textAlign: "right" }}>
              Retention
            </th>
          ) : null}
        </tr>
      </thead>
      <tbody>
        {lineItems.map((item) => (
          <tr key={item.id}>
            <td>{item.name}</td>
            {hasRetentionInfo ? (
              <td style={{ textAlign: "right" }}>
                {item.retention_period
                  ? `${item.retention_period} day(s)`
                  : "N/A"}
              </td>
            ) : null}
          </tr>
        ))}
      </tbody>
    </table>
  );
};

const PurposeVendorDetails = ({
  purposes,
  specialPurposes,
}: {
  purposes: EmbeddedPurpose[] | undefined;
  specialPurposes: EmbeddedPurpose[] | undefined;
}) => {
  const emptyPurposes = purposes ? purposes.length === 0 : true;
  const emptySpecialPurposes = specialPurposes
    ? specialPurposes.length === 0
    : true;

  if (emptyPurposes && emptySpecialPurposes) {
    return null;
  }

  return (
    <Fragment>
      <VendorDetails label="Purposes" lineItems={purposes} />
      <VendorDetails label="Special purposes" lineItems={specialPurposes} />
    </Fragment>
  );
};

const DataCategories = ({
  gvlVendor,
  dataCategories,
}: {
  gvlVendor: Vendor | undefined;
  dataCategories: GvlDataCategories | undefined;
}) => {
  if (!gvlVendor || !dataCategories) {
    return null;
  }

  const declarations: GvlDataDeclarations | undefined =
    // @ts-ignore this type doesn't exist in v2.2 but does in v3
    gvlVendor.dataDeclaration;

  return (
    <table className="fides-vendor-details-table">
      <thead>
        <tr>
          <th>Data categories</th>
        </tr>
      </thead>
      <tbody>
        {declarations?.map((id) => {
          const category = dataCategories[id];
          return (
            <tr key={id}>
              <td>{category?.name || ""}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
};

const StorageDisclosure = ({ vendor }: { vendor: VendorRecord }) => {
  const {
    name,
    uses_cookies: usesCookies,
    uses_non_cookie_access: usesNonCookieAccess,
    cookie_max_age_seconds: cookieMaxAgeSeconds,
    cookie_refresh: cookieRefresh,
  } = vendor;
  let disclosure = "";
  if (usesCookies) {
    const days = cookieMaxAgeSeconds
      ? Math.ceil(cookieMaxAgeSeconds / 60 / 60 / 24)
      : 0;
    disclosure = `${name} stores cookies with a maximum duration of about ${days} Day(s).`;
    if (cookieRefresh) {
      disclosure = `${disclosure} These cookies may be refreshed.`;
    }
    if (usesNonCookieAccess) {
      disclosure = `${disclosure} This vendor also uses other methods like "local storage" to store and access information on your device.`;
    }
  } else if (usesNonCookieAccess) {
    disclosure = `${name} uses methods like "local storage" to store and access information on your device.`;
  }

  if (disclosure === "") {
    return null;
  }

  // Return null if the disclosure string is empty
  if (!disclosure) {
    return null;
  }

  return <p>{disclosure}</p>;
};

const ToggleChild = ({
  vendor,
  experience,
}: {
  vendor: VendorRecord;
  experience: PrivacyExperience;
}) => {
  const gvlVendor = vendorGvlEntry(vendor.id, experience.gvl);
  const dataCategories: GvlDataCategories | undefined =
    // @ts-ignore the IAB-TCF lib doesn't support GVL v3 types yet
    experience.gvl?.dataCategories;
  const hasUrls =
    vendor.privacy_policy_url || vendor.legitimate_interest_disclosure_url;
  return (
    <Fragment>
      <StorageDisclosure vendor={vendor} />
      {hasUrls && (
        <div>
          {vendor.privacy_policy_url && (
            <ExternalLink href={vendor.privacy_policy_url}>
              Privacy policy
            </ExternalLink>
          )}
          {vendor.legitimate_interest_disclosure_url && (
            <ExternalLink href={vendor.legitimate_interest_disclosure_url}>
              Legitimate interest disclosure
            </ExternalLink>
          )}
        </div>
      )}
      <PurposeVendorDetails
        purposes={[
          ...(vendor.purpose_consents || []),
          ...(vendor.purpose_legitimate_interests || []),
        ]}
        specialPurposes={vendor.special_purposes}
      />
      <VendorDetails label="Features" lineItems={vendor.features} />
      <VendorDetails
        label="Special features"
        lineItems={vendor.special_features}
      />
      <DataCategories gvlVendor={gvlVendor} dataCategories={dataCategories} />
    </Fragment>
  );
};

const PagedVendorData = ({
  experience,
  vendors,
  enabledIds,
  onChange,
}: {
  experience: PrivacyExperience;
  vendors: VendorRecord[];
  enabledIds: string[];
  onChange: (newIds: string[]) => void;
}) => {
  const { activeChunk, totalPages, ...paging } = usePaging(vendors);

  const {
    gvlVendors,
    otherVendors,
  }: {
    gvlVendors: VendorRecord[];
    otherVendors: VendorRecord[];
  } = useMemo(
    () => ({
      gvlVendors: activeChunk.filter((v) => v.isGvl),
      otherVendors: activeChunk.filter((v) => !v.isGvl),
    }),
    [activeChunk]
  );

  return (
    <Fragment>
      <RecordsList<VendorRecord>
        title="IAB TCF vendors"
        items={gvlVendors}
        enabledIds={enabledIds}
        onToggle={onChange}
        renderBadgeLabel={(vendor) =>
          vendorGvlEntry(vendor.id, experience.gvl) ? "IAB TCF" : undefined
        }
        renderToggleChild={(vendor) => (
          <ToggleChild vendor={vendor} experience={experience} />
        )}
      />
      <RecordsList<VendorRecord>
        title="Other vendors"
        items={otherVendors}
        enabledIds={enabledIds}
        onToggle={onChange}
        renderToggleChild={(vendor) => (
          <ToggleChild vendor={vendor} experience={experience} />
        )}
      />
      <PagingButtons {...paging} />
    </Fragment>
  );
};

const TcfVendors = ({
  experience,
  enabledVendorConsentIds,
  enabledVendorLegintIds,
  onChange,
}: {
  experience: PrivacyExperience;
  enabledVendorConsentIds: string[];
  enabledVendorLegintIds: string[];
  onChange: (payload: UpdateEnabledIds) => void;
}) => {
  // Combine the various vendor objects into one object for convenience
  const vendors = useMemo(
    () => transformExperienceToVendorRecords(experience),
    [experience]
  );

  const [activeLegalBasisOption, setActiveLegalBasisOption] = useState(
    LEGAL_BASIS_OPTIONS[0]
  );

  const filteredVendors = useMemo(() => {
    const legalBasisFiltered =
      activeLegalBasisOption.value === LegalBasisEnum.CONSENT
        ? vendors.filter((v) => v.isConsent)
        : vendors.filter((v) => v.isLegint);
    // Put "other vendors" last in the list
    return [
      ...legalBasisFiltered.filter((v) => v.isGvl),
      ...legalBasisFiltered.filter((v) => !v.isGvl),
    ];
  }, [activeLegalBasisOption, vendors]);

  return (
    <div>
      <RadioGroup
        options={LEGAL_BASIS_OPTIONS}
        active={activeLegalBasisOption}
        onChange={setActiveLegalBasisOption}
      />
      <PagedVendorData
        experience={experience}
        vendors={filteredVendors}
        enabledIds={
          activeLegalBasisOption.value === LegalBasisEnum.CONSENT
            ? enabledVendorConsentIds
            : enabledVendorLegintIds
        }
        onChange={(newEnabledIds) =>
          onChange({
            newEnabledIds,
            modelType:
              activeLegalBasisOption.value === LegalBasisEnum.CONSENT
                ? "vendorsConsent"
                : "vendorsLegint",
          })
        }
        // This key forces a rerender when legal basis changes, which allows paging to reset properly
        key={`vendor-data-${activeLegalBasisOption.value}`}
      />
    </div>
  );
};

export default TcfVendors;
