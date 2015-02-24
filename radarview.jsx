/*global $,React,console,_*/

function getRadarData() {
    var deferred = $.Deferred();
    var data = {};
    var currentCategory;
    var currentItem = {};
    $.get("radar.txt").done(function(response) {
        var lines = response.split("\n");
        $.each(lines, function(index, line) {
            if(line.indexOf("[") === 0) {
                currentCategory=line.substr(1, line.length-2);
                data[currentCategory] = [];
            }
            else if(line.length > 0 && line[0] !== ' ') {
                currentItem = {};
                currentItem.name = line;
                data[currentCategory].push(currentItem);
            }
            else if($.trim(line).indexOf("status:") === 0) {
                currentItem.status = $.trim($.trim(line).replace("status:", ""));
            }
            else if($.trim(line).indexOf("notes:") === 0) {
                currentItem.notes = $.trim( $.trim(line).replace("notes:", "") );
            }
            else if($.trim(line).indexOf("tags:") === 0) {
                currentItem.tags = $.trim($.trim(line).replace("tags:", "")).split(",");
                currentItem.tags = $.map(currentItem.tags, function(val, i) {
                    return $.trim(val);
                });
            }
        });
        deferred.resolve(data);
    });
    return deferred.promise();
}

var TechInfo = React.createClass({
    getInitialState: function() {
        return { showTags: "none"};
    },
    toggleShowTags: function() {
        if(this.state.showTags === "none")
            this.setState({showTags: "block"});
        else
            this.setState({showTags: "none"});
    },
    render: function() {
        var tags = [];
        if(this.props.data.tags) {
            tags = $.map(this.props.data.tags,function(tag) {
                return <div className="tag" key={tag}>{tag}</div>;
            });
        }
        if(this.props.data.notes) {
            tags.push(<div className="note" key="note">{this.props.data.notes}</div>);
        }
        return (
            <div className={"techname " + this.props.data.status}>
                <span onClick={this.toggleShowTags}>{this.props.data.name}</span>
                <div className="tags" style={{display:this.state.showTags}}>{tags}</div>
            </div>
        );
    }
});

var sortByStatus = function(a, b){
    var sortOrder = ["preferred", "accepted", "experimental", "outoffavor"];
    var idxA = sortOrder.indexOf(a.status);
    var idxB = sortOrder.indexOf(b.status);
    return idxA - idxB;
    
};

var Category = React.createClass({
    render: function() {
        var sorted = this.props.techs.sort(sortByStatus); 
        var techs = $.map(sorted, function(techData) {
            return <TechInfo data={techData} key={techData.name}/>;
        });
        return (
            <div className="category clearfix">
                <h2>{this.props.name}</h2>
                {techs}
            </div>
        );
    }
});
var Categories = React.createClass({
    render: function() {
        var categories = $.map(this.props.data, function(techs, name) {
            return <Category techs={techs} name={name} key={name}/>;
        });
        return (
            <div className="items clearfix">
                {categories}
            </div>
        );
    }
});

var Tag = React.createClass({
    toggleSelected: function() {
        this.props.onSelectedChanged(this.props.tag.name, !this.props.tag.selected);
    },
    render: function() {
        var classNames = "tag tag-button";
        if(this.props.tag.selected)
            classNames += " tag-enabled";
        return <div className={classNames} onClick={this.toggleSelected}>{this.props.tag.name}</div>;
    }
});

var TagList = React.createClass({
    render: function() {
        var tags = _.map(this.props.data, function(tag) {
            return <Tag tag={tag} key={tag.name} onSelectedChanged={this.props.onSelectedChanged}/>;
        }, this);

        return <div className="tag-list">{tags}</div>;
    }
});

var RadarPage = React.createClass({
    getInitialState: function() {
        return {
            radarData: this.props.data,
            tagList: this.getTagList()
        };
    },
    onFilterChanged: function(event) {
        this.filter($.trim(event.target.value), this.state.tagList);
    },
    filter: function(filterQuery, tagList) {
        var selectedTags = _.filter(tagList, function(tag) {
            return tag.selected === true;
        });

        if(filterQuery && filterQuery.length === 0 && selectedTags.length === 0)  {
            this.setState({ radarData: this.props.data });
            return;
        }

        var categories = _.keys(this.props.data);
        var filterResults = _.clone(this.props.data);
        //first filter by tag
        if(selectedTags.length > 0) {
            _.each(categories, function(category) {
                var filtered = _.filter(filterResults[category], function(tech) {
                    return _.some(tech.tags, function(tag) {
                        return _.some(selectedTags, function(selectedTag) {
                            return selectedTag.name === tag;
                        });
                    });
                });
                filterResults[category] = filtered;
            }, this);
        }

        //then by filter query
        if(filterQuery && filterQuery.length > 0) {
            _.each(categories, function(category) {
                var filtered = _.filter(filterResults[category], function(tech) {
                    return tech.name.toLowerCase().indexOf(filterQuery) !== -1; 
                });
                filterResults[category] = filtered;
            }, this);
        }
        this.setState({radarData: filterResults, filterQuery: filterQuery});
    },
    getTagList: function() {
        var allTags = _.map(this.props.data, function(techs, category) {
            return _.map(techs, function(tech) { return tech.tags; });
        });
        var tagList = _.chain(allTags)
                    .flatten()
                    .uniq()
                    .filter(function(tag) { return tag && tag.length > 0; })
                    .map(function(tag) { return { name: tag, selected: false }; })
                    .value();
        return tagList;
    },
    selectedTagChanged: function(tagName, newSelectedValue) {
        var tagList = _.map(this.state.tagList, function(tag) {
            if(tag.name === tagName)
                return {name: tagName, selected: newSelectedValue};
            else
                return tag;
        });
        this.setState({tagList: tagList});
        this.filter(this.state.filterQuery, tagList);
    },
    render: function() {
        return (
            <div>
                <h1>CJ Technology Radar</h1>
                <div className="controls">filter: <input className="filter" type="text" onChange={this.onFilterChanged}></input></div>
                <TagList data={this.state.tagList} onSelectedChanged={this.selectedTagChanged}/>
                <div className="tag-list"></div>
                <hr/>
                <div className="key">
                <div className="techname preferred">Preferred: Get wider dept. buy-in before using something other than this</div>
                <div className="techname accepted">Accepted: Pick from any one of these</div>
                <div className="techname experimental">Experimental/Trial: We're experimenting with it.  Experiments typically have these qualities:
                    <ul>
                        <li>self-contained/isolated (wrt area of code, etc)</li>
                        <li>easy to back-out</li>
                        <li>non-business-critical spot</li>
                        <li>has a non-trival, potential benefit</li>
                   </ul>
                </div>
                <div className="techname outoffavor">Out of favor: Might see this in the code.  Actively eradicate where able.</div>
                </div>
                <hr/>
                <Categories data={this.state.radarData}/>       
            </div>
        );
    }
});
getRadarData().done(function(result) {
    React.render(<RadarPage data={result}/>, document.getElementById("content"));
});


