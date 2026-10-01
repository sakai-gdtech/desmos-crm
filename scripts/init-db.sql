-- Bootstrap local. Runtime role cannot bypass RLS or create other roles/databases.
CREATE ROLE orbit WITH LOGIN PASSWORD 'orbit_local_password' NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS;
CREATE DATABASE orbit OWNER orbit;
CREATE DATABASE orbit_test OWNER orbit;
