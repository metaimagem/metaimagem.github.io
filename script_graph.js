const nodeToBoxMap = {
    "Leadership": "professional",
    "Collaboration": "professional",
    "Networking": "professional",
    "Computer Science": "education",
    "Data Science": "education",
    "Machine Learning": "education",
    "Artificial Intelligence": "research",
    "Natural Language Processing": "research",
    "Computer Vision": "research",
    "Python": "technologies",
    "JavaScript": "technologies",
    "SQL": "technologies"
};

class SkillsNetwork {
    constructor(containerId) {
        this.container = d3.select(containerId);
        
        // Force a reflow to ensure we get correct dimensions
        this.container.node().offsetHeight;
        
        const bounds = this.container.node().getBoundingClientRect();
        this.width = bounds.width;
        this.height = bounds.height;
        
        this.svg = this.container.append("svg")
            .attr("width", "100%")
            .attr("height", "100%")
            .attr("preserveAspectRatio", "xMidYMid meet")
            .attr("viewBox", `0 0 ${this.width} ${this.height}`);
            
        this.g = this.svg.append("g");
        
        this.simulation = d3.forceSimulation()
            .force("link", d3.forceLink().id(d => d.id).distance(80))
            .force("charge", d3.forceManyBody().strength(-98))
            .force("center", d3.forceCenter(this.width / 2, this.height / 2))
            .alphaTarget(0)
            .alphaDecay(0.1)
            .alphaMin(0.001);

        this.zoom = d3.zoom()
            .scaleExtent([0.1, 4])
            .on("zoom", (event) => {
                this.g.attr("transform", event.transform);
            });
            
        this.svg.call(this.zoom);

        // Add a resize handler
        window.addEventListener('resize', () => {
            const bounds = this.container.node().getBoundingClientRect();
            this.width = bounds.width;
            this.height = bounds.height;
            
            this.svg
                .attr("viewBox", `0 0 ${this.width} ${this.height}`);
            
            // Update force simulation center
            this.simulation.force("center", d3.forceCenter(this.width / 2, this.height / 2));
            this.simulation.alpha(0.3).restart();
        });
    }

    update(data) {
        console.log("Data received:", data);

        this.g.selectAll("*").remove();

        const links = this.g.append("g")
            .selectAll("line")
            .data(data.links)
            .enter().append("line")
            .attr("class", "link");

        const nodes = this.g.append("g")
            .selectAll("g")
            .data(data.nodes)
            .enter().append("g")
            .attr("class", "node")
            .attr("id", d => d.name.toLowerCase().replace(/\s+/g, '-'))
            .call(d3.drag()
                .on("start", (event) => this.dragstarted(event))
                .on("drag", (event) => this.dragged(event))
                .on("end", (event) => this.dragended(event)))
            .on("mouseover", (event, d) => {
                this.showTooltip(event, d);
                // Add movement effect on hover
                this.simulation
                    .force("charge")
                    .strength(d => {
                        const isHovered = d === event.target.__data__;
                        return isHovered ? -150 : -98;
                    });
                // Add random movement on hover
                this.simulation.force("random", () => {
                    this.simulation.nodes().forEach(node => {
                        node.x += (Math.random() - 0.5) * 0.4;
                        node.y += (Math.random() - 0.5) * 0.4;
                    });
                });
                this.simulation.alphaTarget(0.3).restart();
            })
            .on("mouseout", () => {
                this.hideTooltip();
                // Remove random force and reset charge
                this.simulation.force("random", null);
                this.simulation
                    .force("charge")
                    .strength(-98);
                this.simulation.alphaTarget(0).restart();
            });

        nodes.append("circle")
            .attr("r", 4);

        nodes.append("text")
            .attr("dx", 8)
            .attr("dy", ".35em")
            .style("font-weight", 400)
            .style("fill", "white")
            .style("font-size", "10px")
            .text(d => d.name)
            .attr("text-anchor", "start");

        this.simulation
            .nodes(data.nodes)
            .on("tick", () => {
                links
                    .attr("x1", d => d.source.x)
                    .attr("y1", d => d.source.y)
                    .attr("x2", d => d.target.x)
                    .attr("y2", d => d.target.y);

                nodes
                    .attr("transform", d => `translate(${d.x},${d.y})`);
            });

        this.simulation.force("link")
            .links(data.links);
    }

    showTooltip(event, d) {
        console.log("Tooltip data:", d);
        const tooltip = d3.select("#tooltip");
        tooltip.style("visibility", "visible")
            .text(d.name)
            .style("left", (event.pageX + 5) + "px")
            .style("top", (event.pageY + 5) + "px");
    }

    hideTooltip() {
        d3.select("#tooltip").style("visibility", "hidden");
    }

    dragstarted(event) {
        if (!event.active) this.simulation.alphaTarget(0.3).restart();
        event.subject.fx = event.subject.x;
        event.subject.fy = event.subject.y;
    }

    dragged(event) {
        event.subject.fx = event.x;
        event.subject.fy = event.y;
    }

    dragended(event) {
        if (!event.active) this.simulation.alphaTarget(0);
        event.subject.fx = null;
        event.subject.fy = null;
    }

    nodeClicked(d) {
        const relatedBoxId = nodeToBoxMap[d.name];
        if (relatedBoxId) {
            const relatedBox = document.getElementById(relatedBoxId);
            if (relatedBox) {
                relatedBox.scrollIntoView({ behavior: 'smooth' });
            }
        }
    }
}

function parseGraphData(text) {
    const nodes = new Set();
    const links = new Map();
    
    const skillRegex = /\[(.*?)\]/g;
    
    text.split('\n').forEach(line => {
        const matches = line.match(skillRegex);
        if (matches) {
            matches.forEach(match => {
                const skill = match.slice(1, -1);
                nodes.add(skill);
            });
            
            for (let i = 0; i < matches.length - 1; i++) {
                const source = matches[i].slice(1, -1);
                const target = matches[i + 1].slice(1, -1);
                const linkKey = `${source}-${target}`;
                links.set(linkKey, {
                    source: source,
                    target: target
                });
            }
        }
    });

    return {
        nodes: Array.from(nodes).map((name, index) => ({ id: String(index), name: name })),
        links: Array.from(links.values()).map(link => ({
            source: String(Array.from(nodes).indexOf(link.source)),
            target: String(Array.from(nodes).indexOf(link.target))
        }))
    };
}

// --- Defer Initialization ---
function initializeGraph() {
    // Initialize the network
    const network = new SkillsNetwork("#skills-network");

    // Load and parse the graph_words.txt file
    fetch('graph_words.txt')
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.text();
        })
        .then(text => {
            if (text.trim() === "") {
                 console.warn("graph_words.txt is empty. No graph data to load.");
                 return; // Don't try to parse empty data
            }
            const skillsData = parseGraphData(text);
            if (skillsData && skillsData.nodes && skillsData.links) {
                 console.log("Updating graph with data:", skillsData);
                 network.update(skillsData);
            } else {
                 console.error("Parsed skills data is invalid:", skillsData);
            }
        })
        .catch(error => console.error('Error loading or parsing graph data:', error));
}

// Wait for the DOM to be ready, then wait for the next animation frame
document.addEventListener('DOMContentLoaded', function() {
    requestAnimationFrame(initializeGraph);

    // --- Keep other DOMContentLoaded logic separate ---
    const boxes = document.querySelectorAll('.grid-container .bento-box');
    
    boxes.forEach(box => {
        box.addEventListener('click', function() {
            const link = this.querySelector('.view-link');
            
            // If this box is already expanded, collapse it and change text back to "view"
            if (this.classList.contains('expanded')) {
                this.classList.remove('expanded');
                if (link) {
                    link.textContent = "view"; // Change text back to "View"
                    link.style.color = "var(--color-link)"; // Set color to link color
                }
                return;
            }
            
            // Collapse any other expanded box and change their text back to "view"
            boxes.forEach(b => {
                b.classList.remove('expanded');
                const otherLink = b.querySelector('.view-link');
                if (otherLink) {
                    otherLink.textContent = "view"; // Reset other boxes to "View"
                    otherLink.style.color = "var(--color-link)"; // Set color to link color
                }
            });
            
            // Expand this box and change text to "Go Back"
            this.classList.add('expanded');
            if (link) {
                link.textContent = "Go Back"; // Change text to "Go Back"
                link.style.color = "var(--color-text)"; // Set color to white
            }
        });
    });

    initializeExpandableBoxes();
});

// Example distribution of words into categories
const wordDistribution = {
    professional: ["Leadership", "Collaboration", "Networking"],
    education: ["Computer Science", "Data Science", "Machine Learning"],
    research: ["Artificial Intelligence", "Natural Language Processing", "Computer Vision"],
    technologies: ["Python", "JavaScript", "SQL"]
};

// Update the content dynamically based on the distribution
function updateContent() {
    Object.entries(wordDistribution).forEach(([category, words]) => {
        const section = document.getElementById(category);
        const ul = section.querySelector('ul');
        ul.innerHTML = words.map(word => `<li>${word}</li>`).join('');
    });
}

// Call this function after loading the PDF and processing the words
document.addEventListener('DOMContentLoaded', () => {
    updateContent(); // Call your function here
});

console.log(this.wordCloud); // Check if this is null

document.addEventListener('DOMContentLoaded', () => {
    const professionalBox = document.getElementById('professional');
    const pdfIframe = document.getElementById('professional-pdf');
    const link = document.getElementById('professional-link'); // Get the link element
    
    // Set the title for the Professional box
    const titleElement = professionalBox.querySelector('h3');
    titleElement.textContent = "Professional"; // Set title to "Professional"

    // Initially hide the PDF iframe
    pdfIframe.style.display = "none";

    professionalBox.addEventListener('click', () => {
        // Check if the PDF iframe is currently displayed
        if (pdfIframe.style.display === "none" || pdfIframe.style.display === "") {
            pdfIframe.style.display = "block"; // Show the PDF
            link.textContent = "Go Back"; // Change link text to "Go Back"
        } else {
            pdfIframe.style.display = "none"; // Hide the PDF
            link.textContent = "View"; // Reset link text to "View"
        }
    });
});

function updateWordCloud(words) {
    const wordCloud = document.getElementById('word-cloud');
    wordCloud.innerHTML = ""; // Clear existing words

    Object.entries(words).forEach(([word, count]) => {
        const wordElement = document.createElement('span');
        wordElement.textContent = word;
        wordElement.className = 'word';
        wordElement.style.fontSize = `${calculateFontSize(count)}px`; // Adjust font size

        wordCloud.appendChild(wordElement); // Append the word to the container
    });
}

// Example function to calculate font size
function calculateFontSize(count) {
    return Math.max(10, 20 - count); // Example logic for font size
}

document.querySelectorAll('.professional-box').forEach(box => {
    box.addEventListener('click', function() {
        this.classList.toggle('expanded');
        console.log('Class toggled:', this.classList.contains('expanded'));  // This will log true or false
    });
});

document.querySelectorAll('.box').forEach(box => {
    box.addEventListener('click', function() {
        // Remove active class from all boxes
        document.querySelectorAll('.box').forEach(b => b.classList.remove('active'));
        
        // Add active class to the clicked box
        this.classList.add('active');
    });
});

function initializeExpandableBoxes() {
    // Create overlay
    const overlay = document.createElement('div');
    overlay.className = 'overlay';
    document.body.appendChild(overlay);

    // Get all grid item titles
    const titles = document.querySelectorAll('.grid-item h1, .grid-item h3');
    
    titles.forEach(title => {
        title.addEventListener('click', (e) => {
            e.stopPropagation(); // Prevent event bubbling
            const box = title.closest('.grid-item');
            
            // If already expanded, collapse
            if (box.classList.contains('expanded')) {
                box.classList.remove('expanded');
                overlay.classList.remove('active');
                return;
            }
            
            // Collapse any other expanded boxes
            document.querySelectorAll('.grid-item.expanded').forEach(expandedBox => {
                expandedBox.classList.remove('expanded');
            });
            
            // Expand this box
            box.classList.add('expanded');
            overlay.classList.add('active');
        });
    });
    
    // Close on overlay click
    overlay.addEventListener('click', () => {
        document.querySelectorAll('.grid-item.expanded').forEach(box => {
            box.classList.remove('expanded');
        });
        overlay.classList.remove('active');
    });
}
