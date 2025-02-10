import React from "react";
import { getJobDetails } from "../../lib/jobs-api";
import axios from "axios";
import { marked } from "marked";
import Container from "../../components/container";
import 'github-markdown-css/github-markdown-light.css';

type Props = {
  params: Promise<{ slug: string }>;
};

async function Page({ params }: Props) {
  const { slug } = await params;
  const { data } = await axios.get(getJobDetails("company-profiles/" + slug));
  const html = marked.parse(data);

  return (
    <div className="py-10">
      <Container>
        <div className="markdown-body" dangerouslySetInnerHTML={{ __html: html }} />
      </Container>
    </div>
  );
}

export default Page;
