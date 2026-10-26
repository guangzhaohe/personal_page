We are entering an era where general-purpose agents can do almost anything, and I believe all vision and robotics researchers can feel that.
Things that used to require carefully designed pipelines and task-specific engineering (perhaps merely a few months ago) can now easily be accomplished by asking an agent nicely.

People might go the easiest way and tell you: "Hey, vision is dead, stop working on it".
But you still find all these models (depth, segmentation, image-to-3D, VLA) being called everywhere as tools, so **clearly agents still need them**.

The thing was never to **stop working on them**, but rather to **start working on them smartly**.

So, if an off-the-shelf agent can already do 90% of things, what is left for us to research? 

There might be two particularly promising directions.

## 1. From agentic systems to "supercharging" amortized models

I believe 99% of all vision and robotics problems are data problems. and unlike ever before, we have access to unprecedented amount of automated intelligence that can help us scale data. 
Instead of squeezing out gains through complicated architectures, weird representations, or training tricks, we can use agents to massively produce richer supervision and supercharge the models we already have.
The biggest opportunity is no longer "how to design a cleverer model", but to build smarter and more scalable agentic data pipelines that output insane amount of high quality data.

**This was not always the case.** 
In fact, a lot of early agentic research in vision and robotics focused on using agents to perform traditional tasks, normally handled by specialized models or algorithms, just to prove that "you know what, agents can also do the job".

Speaking from personal experience, we did *Thinking in Blender* [[1]](#ref-1) back in May this year.
At that time, we saw the potential *VIGA* [[2]](#ref-2) showed and tried to tell people that with the right harnessing, general agents can do 3D reconstruction with only their raw perception, no tools needed.
It was kind of similar to the recent "Astra 3D coding hype" [[3]](#ref-3), just now that the models have gotten so much better they don't really rely on "harness" that much anymore.

<figure>
  <a href="assets/thinking-in-blender-pipeline.webp" target="_blank" rel="noopener" aria-label="View the Thinking in Blender pipeline at full size">
    <img src="assets/thinking-in-blender-pipeline.webp" alt="Thinking in Blender pipeline: a reference image produces candidate scene rollouts, followed by rollout selection and iterative refinement and verification of geometry, materials, composition, and lighting, guided by a scene graph." width="2200" height="694" loading="lazy">
  </a>
  <figcaption>Thinking in Blender uses a staged workflow to help an agent reconstruct 3D scenes without external vision tools, guiding it through geometry, material, composition, and lighting refinement.</figcaption>
</figure>

In the robotics realm of things, works like *ASPIRE* [[4]](#ref-4) and *CaP-X* [[5]](#ref-5) demonstrated how agents can be used to perform robotic manipulation.

These are interesting, cool demonstrations of what agents can accomplish. 
But it seems like that these have become more and more of an X post gimmick or a fun party trick, rather than a true research topic.
One reason is that these harnesses will easily be distilled into or learned by the base VLM itself.

The other reason is this: **after all the hype fades, at the end of the day, do these agentic systems really get the job done?**

I think not. The problem is efficiency. These agents operate on tokens, while vision and robotics deal with dense signals: a single image can already contain millions of pixel values. Generating or manipulating all of that directly, token by token, is simply impractical. To get useful work done, agents still have to call specialized tools and models. But wrapping even simple tasks in repeated rounds of agent reasoning and tool calls adds substantial latency and cost. At the end of the day, getting a task done once is very different from getting it done efficiently enough to run in a real system.

So what's the next step?

**Distill these slow, expensive agentic systems into fast, amortized models. That is a data research problem.**

Agents are remarkably flexible but inefficient.
Instead of treating the agent as the final solution, we can treat it as the most one-time powerful data generator and teacher for vision and robotics.

For example:

- An agentic system can search the internet and use the collected information to geolocate an observed scene, as in GeoGuessr, producing geolocation labels for training specialized models.
- An agentic manipulation system can decompose tasks, interact with tools, and generate successful real-world action trajectories. These trajectories can then be used to train efficient VLA or WAM models.
- An agent can iteratively build and refine complex 3D scenes, producing structured scene representations paired with rendered images to train specialized reconstruction models.

I like to think of this as **agents fundamentally expanding the information range from which supervisions are derived**. Traditionally, vision models have learned from relatively constrained data sources: unlabeled data, human annotations, sensor measurements, or geometric constraints. An agent, however, can access and provide a much broader space of information. It can search the internet, retrieve knowledge about the physical world, combine heterogeneous sources of evidence, execute programs, test hypotheses, and iteratively correct its predictions, all while generating detailed thinking traces. This gives us information richer than ever before.

In some sense, we're no longer just distilling a particular model or dataset. We're distilling the knowledge and reasoning capabilities of a VLM, together with the vast and existing external information the agent can access, into a specialized model, e.g. the internet or the physical environment.

<figure>
  <a href="assets/agent-supervision-sources.svg" target="_blank" rel="noopener" aria-label="View the agent supervision diagram at full size">
    <img src="assets/agent-supervision-sources.svg" alt="Existing images, labels, sensor measurements, and geometry combine with web knowledge, code, simulation, and interaction. An agent gathers, tests, and refines this information to produce labels, trajectories, and scene representations for training a specialized model with fast inference." width="1627" height="967" loading="lazy">
  </a>
  <figcaption>Agents can combine existing data with web knowledge, tools, simulation, and interaction to generate richer supervision for fast, specialized models. <b>Image generated with ChatGPT Images then converted into SVG.</b></figcaption>
</figure>

The new challenge and research focus for this direction is therefore: 

> **How do we build <u>scalable</u>, <u>robust</u> data generation pipelines where agents gather and verify the <u>right</u> information from the <u>right</u> sources, then turn it into effective supervision for fast, amortized models <u>to get the jobs done</u>?**

## 2. From traditional tasks to "breaking" new territory

The second direction is perhaps even more interesting to me.

Instead of using agents to reproduce traditional vision and robotics tasks, what if we used them to tackle tasks we had never thought to attempt?

One underappreciated advantage of agents is that they don't get tired. They can repeatedly inspect results, make tiny adjustments, execute tools, diagnose failures, and try again. They can perform thousands of tedious operations that no human would realistically have the time or patience to complete.

And interestingly, many of these operations don't require extraordinary intelligence. They just require persistence, iteration, and access to the right tools.

One example is Karpathy's experiment with turning the opening paragraph of *The Lord of the Rings* into a 3D animation. As he put it, “LLMs have all the stamina and patience in the world.” [[6]](#ref-6) To me, this points to a new direction for agents: tackling tasks we never considered feasible because of the sheer amount of tedious labor involved, opening up possibilities for highly customized worlds, content, and tasks.

Another recent example I really like is *OPAL* [[7]](#ref-7), where an agent observes training dynamics and modifies the optimizer during training. 

I suspect there is a much larger unexplored space of tasks with this property. Rather than asking, "Can an agent solve this existing problem?", perhaps we should ask:

> "What problems have we never seriously attempted because solving them would require an unreasonable amount of human effort?"

That's where agents can genuinely expand the frontier of what is possible.

## Where does this leave agentic research?

I don't think either vision robotics or agentic research is dead. Quite the opposite. But the bar for meaningful contributions is changing rapidly.

Demonstrating that an agent can perform an existing task, perhaps with a carefully engineered prompt or workflow, is becoming less compelling on its own. Especially when the next generation of foundation models might accomplish the same thing with substantially less scaffolding.

To me, the more interesting opportunities fall into the two categories:

1. **Use agents to teach better models.** Leverage their reasoning, tools, interaction, and access to external information to generate richer supervision, then amortize these capabilities into models that are faster, cheaper, and easier to deploy.
2. **Use agents to redefine what's feasible.** Identify tasks that are prohibitively labor-intensive or iterative for humans, and develop agentic systems that make entirely new workflows and applications practical.

Of course, these two directions aren't mutually exclusive. An agent could first make a previously infeasible task possible, then generate the experience and supervision needed to train a model that performs it efficiently.

The learning can even go both ways. Agents can help us build better specialized models and use them as tools to tackle new tasks. The knowledge and strategies gained through those interactions could then be distilled back into the model powering the agent, improving its own reasoning and tool use. 

<figure>
  <a href="assets/agent-tool-learning-loop.png" target="_blank" rel="noopener" aria-label="View the agent–tool learning loop at full size">
    <img src="assets/agent-tool-learning-loop.png" alt="A proposed learning loop: an agent explores previously impractical tasks and generates supervision for specialized vision and robotics tools. Successful solutions provide training data for those tools, while tool-use experience feeds back into training the agent." width="1536" height="1024" loading="lazy">
  </a>
  <figcaption>A proposed two-way learning loop: agents tackle new tasks and generate supervision for specialized tools; experience from using those tools can then improve the agents themselves. <b>Image generated with ChatGPT Images.</b></figcaption>
</figure>

**Better agents help build better tools, and better tools help make better agents.** Perhaps that's the most exciting possibility of all. I truly believe some of the most meaningful agentic vision and robotics research will happen in the coming months.

## References

1. <span id="ref-1"></span> Guangzhao He, Rundong Luo, Wei-Chiu Ma, and Hadar Averbuch-Elor. [Thinking in Blender: Staged Executable Inverse Graphics with Vision-Language Models](https://arxiv.org/abs/2606.02580). 2026.
2. <span id="ref-2"></span> Shaofeng Yin et al. [Vision-as-Inverse-Graphics Agent via Interleaved Multimodal Reasoning](https://arxiv.org/abs/2601.11109). 2026.
3. <span id="ref-3"></span> Thomas Ricouard. [Architectural visualization with Astra](https://developers.openai.com/blog/architectural-visualization-with-astra). OpenAI Developers, September 4, 2026.
4. <span id="ref-4"></span> Runyu Lu et al. [ASPIRE: Agentic /Skills Discovery for Robotics](https://research.nvidia.com/labs/gear/aspire/). NVIDIA GEAR, 2026. [Paper](https://arxiv.org/abs/2607.00272).
5. <span id="ref-5"></span> Max Fu et al. [CaP-X: A Framework for Benchmarking and Improving Coding Agents for Robot Manipulation](https://arxiv.org/abs/2603.22435). 2026.
6. <span id="ref-6"></span> Andrej Karpathy. [Post on generating a Lord of the Rings 3D animation with Opus 5](https://x.com/karpathy/status/2083749667410727319). August 2, 2026. [Interactive animation](https://karpathy.ai/lotr-movie/).
7. <span id="ref-7"></span> Xingjian Bai, Jia-Hao Liang, Jayden Teoh, and Vincent Sitzmann. [Reactive Optimizers](https://xingjianbai.com/reactive-optimizers/). October 2026. [OPAL implementation and runtime measurements](https://github.com/xingjian-bai/opal).

## Acknowledgments

I'm grateful to the following people (listed alphabetically by last name) for the discussions at our group meeting that helped shape the ideas in this post: [Aditya Chetan](https://justachetan.github.io/), [Bharath Hariharan](https://www.cs.cornell.edu/~bharathh/), [Gemmechu Hassena](https://gemmechu.github.io/), [Kuan Wei Huang](https://kwhuang88228.github.io/), [Chia-Hsiang Kao](https://iandrover.github.io/), [Rundong Luo](https://red-fairy.github.io/), [Wei-Chiu Ma](https://www.cs.cornell.edu/~weichiu/), [Chuanruo Ning](https://tritiumr.github.io/), [Tao Tu](https://www.cs.cornell.edu/people/tao-tu), [James Wu](https://www.cs.cornell.edu/people/james-wu), and [Haozheng Yu](https://haozheng-yu.github.io/).

## Cite this post

```bibtex
@misc{he2026agenticvision,
  author = {He, Guangzhao},
  title = {A New Era for Agentic Vision and Robotics Research},
  year = {2026},
  month = oct,
  howpublished = {Guangzhao Blogs},
  url = {https://www.guangzhaohe.com/blog/?post=a-new-era-for-agentic-vision-and-robotics-research}
}
```
