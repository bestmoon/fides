from typing import Dict, List

from fidesctl.core.api_helpers import get_server_resource, list_server_resources
from fidesctl.core.utils import echo_green, echo_red
from fideslang.models import DataSubject, DataUse, System


def audit_systems(
    url: str,
    headers: Dict[str, str],
    exclude_keys: List,
) -> None:
    """
    Audits the system resources from the server for compliance.

    This should be flexible enough to accept further audits in
    the future and return them as well as being called from other
    audit functions.
    """

    # get the server resources for systems
    system_resources = list_server_resources(
        url, headers, "system", exclude_keys=exclude_keys
    )

    audit_findings = 0
    for system in system_resources:
        print(f"Auditing System: {system.name}")
        new_findings = validate_system_attributes(system, url, headers)
        audit_findings = audit_findings + new_findings

    if audit_findings > 0:
        print(
            f"{audit_findings} issue(s) were detected in auditing system completeness."
        )
    else:
        echo_green("All systems go!")


def validate_system_attributes(
    system: System,
    url: str,
    headers: Dict[str, str],
) -> int:
    """
    Validates one or multiple attributes are set on a system
    """

    new_findings = 0
    if system.administrating_department == "Not defined":
        echo_red(
            f"{system.name} should have a responsible group, defined as 'administrating_department'."
        )
        new_findings += 1

    for privacy_declaration in system.privacy_declarations:
        data_use = get_server_resource(
            url, "data_use", privacy_declaration.data_use, headers
        )
        data_use_findings = audit_data_use_attributes(data_use, system.name)
        new_findings = new_findings + data_use_findings
        for data_subject_fides_key in privacy_declaration.data_subjects:
            data_subject = get_server_resource(
                url, "data_subject", data_subject_fides_key, headers
            )
            data_subject_findings = audit_data_subject_attributes(
                data_subject, system.name
            )
            new_findings = new_findings + data_subject_findings
    return new_findings


def audit_data_use_attributes(data_use: DataUse, system_name: str) -> int:
    """
    Audits the extended attributes for a DataUse
    """
    data_use_list = ["recipients", "legal_basis", "special_category"]
    findings = 0
    for attribute in data_use_list:
        if getattr(data_use, attribute) is None:
            echo_red(f"{data_use.fides_key} missing {attribute} in {system_name}.")
            findings += 1
    return findings


def audit_data_subject_attributes(data_subject: DataSubject, system_name: str) -> int:
    """
    Audits the extended attributes for a DataSubject
    """
    data_subject_list = ["rights", "automated_decisions_or_profiling"]
    findings = 0
    for attribute in data_subject_list:
        if getattr(data_subject, attribute) is None:
            echo_red(f"{data_subject.fides_key} missing {attribute} in {system_name}.")
            findings += 1
    return findings


def audit_organizations(
    url: str,
    headers: Dict[str, str],
    exclude_keys: List,
) -> None:
    """
    Validates the extra attributes for an Organization are
    correctly populated
    """
    organization_resources = list_server_resources(
        url, headers, "organization", exclude_keys=exclude_keys
    )

    organization_attributes = [
        "controller",
        "data_protection_officer",
        "representative",
        "security_policy",
    ]
    audit_findings = 0
    for organization in organization_resources:
        for attribute in organization_attributes:
            if getattr(organization, attribute) is None:
                echo_red(f"{organization.name} missing {attribute}.")
                audit_findings += 1
    if audit_findings > 0:
        print(
            f"{audit_findings} issue(s) were detected in auditing organization completeness."
        )
    else:
        echo_green("All organizations fully compliant!")
