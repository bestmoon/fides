import pathlib
from setuptools import setup, find_packages
import versioneer

here = pathlib.Path(__file__).parent.resolve()
long_description = open("README.md").read()

# Requirements

# Explicitly add optional dependencies for conda compatiblity, for instance, avoid using fastapi[all]
install_requires = open("requirements.txt").read().strip().split("\n")
dev_requires = open("dev-requirements.txt").read().strip().split("\n")

# Human-Readable/Reusable Extras
postgres_connector = "psycopg2-binary==2.9.0"
mysql_connector = "pymysql==1.0.0"
fastapi = "fastapi==0.68"
uvicorn = "uvicorn==0.15"

extras = {
    "postgres": [postgres_connector],
    "mysql": [mysql_connector],
    "webserver": [fastapi, uvicorn, postgres_connector],
}
extras["all"] = sum(extras.values(), [])

setup(
    name="fidesctl",
    version=versioneer.get_version(),
    cmdclass=versioneer.get_cmdclass(),
    description="CLI for Fides",
    long_description=long_description,
    long_description_content_type="text/markdown",
    url="https://github.com/ethyca/fides",
    entry_points={"console_scripts": ["fidesctl=fidesctl.cli:cli"]},
    python_requires=">=3.7, <4",
    package_dir={"": "src"},
    packages=find_packages(where="src"),
    package_data={"fidesapi": ["alembic.ini"]},
    include_package_data=True,
    author="Ethyca, Inc.",
    author_email="fidesteam@ethyca.com",
    license="Apache License 2.0",
    install_requires=install_requires,
    dev_requires=dev_requires,
    extras_require=extras,
    classifiers=[
        "License :: OSI Approved :: Apache Software License",
        "Programming Language :: Python :: 3 :: Only",
        "Programming Language :: Python :: 3.8",
        "Programming Language :: Python :: 3.9",
        "Topic :: Software Development :: Libraries",
    ],
)
