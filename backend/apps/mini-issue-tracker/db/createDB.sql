CREATE TABLE users(
    id varchar, 
    name varchar
);

CREATE TABLE projects(
    id varchar,
    name varchar,
    description varchar
);

CREATE TABLE issues(
    id varchar,
    projectId varchar,
    title varchar,
    description varchar,
    assignee varchar,
    priority varchar,
    status varchar
);