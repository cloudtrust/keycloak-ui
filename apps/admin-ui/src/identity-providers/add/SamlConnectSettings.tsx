import { FormGroup, Title } from "@patternfly/react-core";
import { useFormContext } from "react-hook-form-v7";

import type IdentityProviderRepresentation from "@keycloak/keycloak-admin-client/lib/defs/identityProviderRepresentation";
import { useTranslation } from "react-i18next";
import { HelpItem } from "../../components/help-enabler/HelpItem";
import { useAdminClient } from "../../context/auth/AdminClient";

import { FileUploadForm } from "../../components/json-file-upload/FileUploadForm";
import { KeycloakTextInput } from "../../components/keycloak-text-input/KeycloakTextInput";
import { useRealm } from "../../context/realm-context/RealmContext";
import environment from "../../environment";
import { addTrailingSlash } from "../../util";
import { getAuthorizationHeaders } from "../../utils/getAuthorizationHeaders";
import { DiscoveryEndpointField } from "../component/DiscoveryEndpointField";
import { DescriptorSettings } from "./DescriptorSettings";

type FormFields = IdentityProviderRepresentation & {
  discoveryError: string;
};

export const SamlConnectSettings = () => {
  const { t } = useTranslation("identity-providers");
  const id = "saml";

  const { adminClient } = useAdminClient();
  const { realm } = useRealm();
  const {
    setValue,
    register,
    setError,
    clearErrors,
    formState: { errors },
  } = useFormContext<FormFields>();

  const setupForm = (result: IdentityProviderRepresentation) => {
    Object.entries(result).map(([key, value]) =>
      setValue(`config.${key}`, value)
    );
  };

  const fileUpload = async (xml: string) => {
    clearErrors("discoveryError");
    if (!xml) {
      return;
    }
    const formData = new FormData();
    formData.append("providerId", id);
    formData.append("file", new Blob([xml]));

    try {
      const response = await fetch(
        `${addTrailingSlash(
          adminClient.baseUrl
        )}admin/realms/${realm}/identity-provider/import-config`,
        {
          method: "POST",
          body: formData,
          headers: getAuthorizationHeaders(await adminClient.getAccessToken()),
        }
      );
      if (response.ok) {
        const result = await response.json();
        setupForm(result);
      } else {
        setError("discoveryError", {
          type: "manual",
          message: response.statusText,
        });
      }
    } catch (error) {
      setError("discoveryError", {
        type: "manual",
        message: (error as Error).message,
      });
    }
  };

  return (
    <>
      <Title headingLevel="h4" size="xl" className="kc-form-panel__title">
        {t("samlSettings")}
      </Title>

      <FormGroup
        label={t("serviceProviderEntityId")}
        fieldId="kc-service-provider-entity-id"
        labelIcon={
          <HelpItem
            helpText="identity-providers-help:serviceProviderEntityId"
            fieldLabelId="identity-providers:serviceProviderEntityId"
          />
        }
        isRequired
        helperTextInvalid={t("common:required")}
        validated={errors.config?.entityId ? "error" : "default"}
      >
        <KeycloakTextInput
          data-testid="serviceProviderEntityId"
          id="kc-service-provider-entity-id"
          validated={errors.config?.entityId ? "error" : "default"}
          defaultValue={`${environment.authServerUrl}/realms/${realm}`}
          {...register("config.entityId", { required: true })}
        />
      </FormGroup>

      <DiscoveryEndpointField
        id="saml"
        fileUpload={
          <FormGroup
            label={t("importConfig")}
            fieldId="kc-import-config"
            labelIcon={
              <HelpItem
                helpText="identity-providers-help:importConfig"
                fieldLabelId="identity-providers:importConfig"
              />
            }
            validated={errors.discoveryError ? "error" : "default"}
            helperTextInvalid={errors.discoveryError?.message}
          >
            <FileUploadForm
              id="kc-import-config"
              extension=".xml"
              hideDefaultPreview
              unWrap
              validated={errors.discoveryError ? "error" : "default"}
              onChange={(value) => fileUpload(value)}
            />
          </FormGroup>
        }
      >
        {(readonly) => <DescriptorSettings readOnly={readonly} />}
      </DiscoveryEndpointField>
    </>
  );
};
