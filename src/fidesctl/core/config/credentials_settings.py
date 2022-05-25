"""This module handles finding and parsing fides configuration files."""

# pylint: disable=C0115,C0116, E0213
import os
from typing import Dict, Optional

from pydantic import BaseModel


# TODO: These credentials objects could be shared with api code being written in fides#642
class DatabaseCredentials(BaseModel):
    """Class used to validate database credentials fields when retrieved from config"""

    connection_string: str


class OktaCredentials(BaseModel):
    """Class used to validate okta credentials fields when retrieved from config"""

    # camel case matches okta client config model
    orgUrl: str
    token: str


class AwsCredentials(BaseModel):
    """Class used to validate aws credentials fields when retrieved from config"""

    aws_access_key_id: str
    aws_secret_access_key: str
    aws_session_token: str = ""
    region_name: str = ""


CREDENTIALS_ENV_PREFIX = "FIDESCTL__CREDENTIALS__"
NESTED_KEY_DELIMITER = "__"


def merge_credentials_environment(credentials_dict: Dict) -> Dict:
    """
    Given a dict of config settings, merges configs which are found
    in environment variables. Environment variable configs are treated
    as overrides. Environment variables muse use the prefix
    FIDESCTL__CREDENTIALS__ and use the delimiter __ to override nested keys.
    Example:
    FIDESCTL__CREDENTIALS__POSTGRES_1_CONNECTION_STRING="MY_CONN"

    Merges:
    {"postgres_1" : { "connection_string": "MY_CONN"}}
    """
    for key, value in os.environ.items():
        if key.startswith(CREDENTIALS_ENV_PREFIX):
            # TODO Replace with removeprefix when 3.9 is required - https://peps.python.org/pep-0616
            # keys are not case sensitive and will be matched with lower case equivalent in config
            stripped_key = key[len(CREDENTIALS_ENV_PREFIX) :].lower()
            insert_environment(
                current_dict=credentials_dict, env_key=stripped_key, env_val=value
            )
    return credentials_dict


def insert_environment(current_dict: Dict, env_key: str, env_val: str) -> None:
    """
    Inserts a value into a dict. The key depth is found recursively and
    creates dict levels as needed.
    """
    # if we find the delimiter treat it as the key, otherwise recurse
    if NESTED_KEY_DELIMITER in env_key:
        env_key_split = env_key.split(NESTED_KEY_DELIMITER, 1)
        current_dict_key = env_key_split[0]
        next_env_key = env_key_split[1]

        # create new dict if key does not exist yet
        next_dict = current_dict.get(current_dict_key, dict())
        current_dict[current_dict_key] = next_dict

        insert_environment(
            current_dict=next_dict, env_key=next_env_key, env_val=env_val
        )
    # also check that the current key is not empty. This is possible
    # if an environment variable has a suffix of __
    elif env_key:
        current_dict[env_key] = env_val


def get_config_database_credentials(
    credentials_config: Dict[str, Dict], credentials_id: str
) -> Optional[DatabaseCredentials]:
    credentials_dict = credentials_config.get(credentials_id, None)
    parsed_config = (
        DatabaseCredentials.parse_obj(credentials_dict) if credentials_dict else None
    )
    return parsed_config


def get_config_okta_credentials(
    credentials_config: Dict[str, Dict], credentials_id: str
) -> Optional[OktaCredentials]:
    credentials_dict = credentials_config.get(credentials_id, None)
    parsed_config = (
        OktaCredentials.parse_obj(credentials_dict) if credentials_dict else None
    )
    return parsed_config


def get_config_aws_credentials(
    credentials_config: Dict[str, Dict], credentials_id: str
) -> Optional[AwsCredentials]:
    credentials_dict = credentials_config.get(credentials_id, None)
    parsed_config = (
        AwsCredentials.parse_obj(credentials_dict) if credentials_dict else None
    )
    return parsed_config
