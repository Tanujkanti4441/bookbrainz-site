/*
 * Copyright (C) 2015-2017  Ben Ockmore
 *               2015-2016  Sean Burke
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 2 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License along
 * with this program; if not, write to the Free Software Foundation, Inc.,
 * 51 Franklin Street, Fifth Floor, Boston, MA 02110-1301 USA.
 */

import {Form, InputGroup, OverlayTrigger, Tooltip} from 'react-bootstrap';
import EntitySelect from './entity-select';
import {FontAwesomeIcon} from '@fortawesome/react-fontawesome';
import LinkedEntitySelect from './linked-entity-select';
import PropTypes from 'prop-types';
import React from 'react';
import SelectAsync from 'react-select/async';
import ValidationLabel from '../common/validation-label';
import _ from 'lodash';
import {faQuestionCircle} from '@fortawesome/free-solid-svg-icons';
import makeImmutable from './make-immutable';
import request from 'superagent';


const ImmutableAsyncSelect = makeImmutable(SelectAsync);

class EntitySearchFieldOption extends React.Component {
	constructor(props) {
		super(props);

		// React does not autobind non-React class methods
		this.fetchOptions = this.fetchOptions.bind(this);
		this.isArea = this.isArea.bind(this);
		this.entityToOption = this.entityToOption.bind(this);
	}

	/**
	 * Determines whether an entity provided to the EntitySearch component is an
	 * Area, using the present attributes.
	 *
	 * @param {Object} entity the entity to test
	 * @returns {boolean} true if the entity looks like an Area
	 */
	isArea(entity) {
		if (entity.type === 'Area') {
			return true;
		}

		return Boolean(entity.gid);
	}

	/**
	 * Takes an entity and converts it to a format acceptable to react-select.
	 *
	 * @param {Object} entity the entity to convert
	 * @returns {Object} the formatted data
	 */
	entityToOption(entity) {
		if (_.isNil(entity)) {
			return null;
		}
		const id = this.isArea(entity) ? entity.id : entity.bbid;
		const languageId = _.get(entity, ['defaultAlias', 'languageId']);
		const language = this.props.languageOptions.find(index => index.value === languageId);
		return {
			disambiguation: _.get(entity, ['disambiguation', 'comment']),
			id,
			language: language && language.label,
			text: _.get(entity, ['defaultAlias', 'name']),
			type: entity.type
		};
	}

	async fetchOptions(query) {
		if (!query) {
			return {
				options: []
			};
		}
		let manipulatedQuery = query;
		const bookbrainzURLRegex = /bookbrainz\.org\/\w+\/([0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12})$/gi;
		const regexpResults = bookbrainzURLRegex.exec(query);
		if (regexpResults && regexpResults.length) {
			manipulatedQuery = regexpResults[1];
		}
		const response = await request
			.get('/search/autocomplete')
			.query({
				q: manipulatedQuery,
				type: this.props.type
			});
		const isSameBBIDFilter = (entity) => entity.bbid !== this.props.bbid;
		const combineFilters = (...filters) => (item) => filters.map((filter) => filter(item)).every((x) => x === true);
		const combinedFilters = combineFilters(isSameBBIDFilter, ...this.props.filters);
		const filteredOptions = response.body.filter(combinedFilters);
		return filteredOptions.map(this.entityToOption);
	}

	renderInputGroup({
		buttonAfter, help, wrappedSelect, ...props
	}) {
		if (!buttonAfter) {
			return (
				<>
					{React.cloneElement(wrappedSelect, props)}
					{help && <Form.Text muted>{help}</Form.Text>}
				</>
			);
		}

		return (
			<InputGroup>
				{React.cloneElement(wrappedSelect, props)}
				{help && <Form.Text muted>{help}</Form.Text>}
				<InputGroup.Append>{buttonAfter}</InputGroup.Append>
			</InputGroup>
		);
	}

	getOptionLabel(option) {
		return option.text;
	}

	render() {
		const labelElement = <ValidationLabel empty={this.props.empty} error={this.props.error}>{this.props.label}</ValidationLabel>;
		const helpIconElement = this.props.tooltipText && (
			<OverlayTrigger
				delay={50}
				overlay={<Tooltip>{this.props.tooltipText}</Tooltip>}
			>
				<FontAwesomeIcon className="margin-left-0-5" icon={faQuestionCircle}/>
			</OverlayTrigger>
		);
		const wrappedSelect = (
			<ImmutableAsyncSelect
				className="Select"
				classNamePrefix="react-select"
				components={{Option: LinkedEntitySelect, SingleValue: EntitySelect}}
				filterOptions={false}
				getOptionLabel={this.getOptionLabel}
				labelKey="text"
				loadOptions={this.fetchOptions}
				onBlurResetsInput={false}
				{...this.props}
			/>
		);

		return (
			<Form.Group>
				<Form.Label>
					{labelElement}
					{helpIconElement}
				</Form.Label>
				{this.renderInputGroup({wrappedSelect, ...this.props})}
			</Form.Group>
		);
	}
}

EntitySearchFieldOption.displayName = 'EntitySearchFieldOption';
EntitySearchFieldOption.propTypes = {
	bbid: PropTypes.string,
	empty: PropTypes.bool,
	error: PropTypes.bool,
	filters: PropTypes.array,
	label: PropTypes.string.isRequired,
	languageOptions: PropTypes.array,
	tooltipText: PropTypes.string,
	type: PropTypes.oneOfType([
		PropTypes.string,
		PropTypes.arrayOf(PropTypes.string)
	]).isRequired
};
EntitySearchFieldOption.defaultProps = {
	bbid: null,
	empty: true,
	error: false,
	filters: [],
	languageOptions: [],
	tooltipText: null
};

export default EntitySearchFieldOption;
