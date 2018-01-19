(function () {

  var app = angular.module('enaMetadata', ['ui.materialize']);

  // // will this work?
  // // leave for now
  // app.config(function ($httpProvider) {
  //     //Enable cross domain calls
  //     $httpProvider.defaults.useXDomain = true;
  // });

  // ContentController
  app.controller('ContentController', ['$scope', function ($scope) { // remove scope?
    var self = this;

    self.tab = 1; // sets start tab: 1 - Study, 2 - Sample, 3 - Sample grid, 4 - Assembly analysis

    self.selectTab = function (setTab) {
      this.tab = setTab;
    };

    self.isSelected = function (checkTab) {
      return self.tab === checkTab;
    };
  }]);

  /* ------------------------------------------
   *   StudyController
   * ------------------------------------------ */
  app.controller('StudyController', ['$scope',function ($scope) {
    // passing in $scope to be able to call $scope.apply() in parseXML() to update data bindings
    // this.items = studyItems;
    var self = this;
    self.centerName = {
      label: 'Center name',
      description: 'The name of your institution as specified in your ENA user account',
      value: '',
      placeholder: ''
    };

    self.shortName = {
      label: 'Short name',
      description: 'A short descriptive name for the project',
      value: ''
    };

    self.title = {
      label: 'Title',
      description: 'A short description of the project akin to an article title',
      value: ''
    };

    self.studyType = {
      label: 'Study type',
      description: '',
      options: [
        'Whole Genome Sequencing',
        'Metagenomics',
        'Transcriptome Analysis',
        'Resequencing',
        'Epigenetics',
        'Synthetic Genomics',
        'Forensic or Paleo-genomics',
        'Gene Regulation Study',
        'Cancer Genomics',
        'Population Genomics',
        'RNASeq',
        'Exome Sequencing',
        'Pooled Clone Sequencing',
        'Other'
      ],
      value: 'Whole Genome Sequencing'
    };

    self.abstract = {
      label: 'Abstract',
      description: 'A detailed description of the project akin to an article abstract',
      value: ''
    };

    self.studyAttributes = [
      {tag: '', value: ''}
    ];

    self.addNewAttribute = function () {
      self.studyAttributes.push({tag: '', value: ''});
    };

    self.removeAttribute = function () {
      var lastItem = self.studyAttributes.length - 1;
      self.studyAttributes.splice(lastItem);
    };

    self.noAttributes = function () {
      return;
    };

    self.saveXML = function () {
      // angular has added a child with the same id, so getting the first child
      var pre_element = $('#pre-study-xml')[0];
      var xml_text = pre_element.textContent || pre_element.innerText;
      var blob = new Blob([xml_text], {type: 'text/xml;charset=utf-8'});
      saveAs(blob, 'study.xml');
    };

    self.parseXML = function () {

      var input = $('#uploadStudyInput')[0].files[0];
      var reader = new FileReader();
      var content;

      reader.onload = function (e) {
        var content = reader.result;

        var xmlDoc = $.parseXML(content); // using jquery to parse the xml string
        var $xml = $(xmlDoc);

        $scope.$apply(function () { // to update bindings
          self.centerName.value = $xml.find('STUDY').attr('center_name');
          self.shortName.value = $xml.find('CENTER_PROJECT_NAME').text();
          self.title.value = $xml.find('STUDY_TITLE').text();
          self.studyType.value = $xml.find('STUDY_TYPE').attr('existing_study_type');
          self.abstract.value = $xml.find('STUDY_ABSTRACT').text();

          self.studyAttributes = [];
          var attributes = $xml.find('STUDY_ATTRIBUTE');
          attributes.each(function () {
            self.studyAttributes.push(
              {
                tag: $(this).find('TAG').text(),
                value: $(this).find('VALUE').text()
              });
          });
        });
      };

      reader.readAsText(input, 'UTF-8');

    };

  }]); // app.controller - StudyController

  /* ------------------------------------------
   *   SamplesController
   * ------------------------------------------ */
  app.controller('SamplesController', ['$scope','$http',function ($scope, $http) {
    // passing in $scope to be able to call $scope.apply() in parseXML() to update data bindings

    var self = this;

    // self.field_names = [ 'centerName', 'name', 'title'];

    self.common = { // object of data common for all samples in sample set
      centerName: {
        label: 'Center name',
        description: 'The name of your institution as specified in your ENA user account',
        value: '',
        placeholder: ''
      },
      name: {
        label: 'Sample name',
        description: 'A unique name for the sample',
        value: '',
        placeholder: 'Sample001'
      },
      title: {
        label: 'Title',
        description: 'A short informative description of the sample',
        value: '',
        placeholder: 'A human sample'
      },
      taxonID: {
        label: 'Organism Taxon ID',
        description: 'Provide NCBI taxon_id for organism (e.g. 9606 for human)',
        value: '',
        placeholder: '9606'
      },
      sci_name: {
        label: 'Organism  scientific name',
        description: 'Scientific name as appears in NCBI taxonomy for the taxon_id (e.g. homo sapiens)',
        value: '',
        placeholder: 'homo sapiens'
      },
      common_name: {
        label: 'Organism common name - optional',
        description: 'The common name for the organism (e.g. human)',
        value: '',
        placeholder: 'human'
      },
      description: {
        label: 'Description - optional',
        description: 'A longer description of sample and how it differs from other samples',
        value: '',
        placeholder: 'Sample from ...'
      },
      attributes: [
        {tag: '', value: '', unit: ''}
      ],
      selected_checklist: {}
    };

    self.list = []; // list of samples and their data to be filled in

    self.checklist = null;
    if (self.checklist === null) {
      var clUrl = 'checklist.php';
      $http.get(clUrl).then(function (response) {
        var clContent = response.data;
        self.checklist = {};
        var clXmlDoc = $.parseXML(clContent);
        var $clXml = $(clXmlDoc);
        var cls = $clXml.find('CHECKLIST');
        cls.each(function () {
          // checklistType should be Sample
          var clType = $(this).attr('checklistType');
          var acc = $(this).attr('accession');

          // Filter out non-sample checklists
          if (clType !== 'Sample') { return; }

          var clDescriptor = $(this).children('DESCRIPTOR');
          var clName = clDescriptor.children('NAME').text().replace(/\s+/g, ' ');
          var clDesc = clDescriptor.children('DESCRIPTION').text().replace(/\s+/g, ' ');
          var clAuth = clDescriptor.children('AUTHORITY');

          var tmpCl = {
            acc: acc,
            name: clName,
            description: clDesc,
            attributes: [
              {
                tag: clAuth.text() + '-CHECKLIST',
                value: acc
              }
            ]
          };
          // get attributes
          var groups = $(this).find('FIELD_GROUP');
          groups.each(function () {
            var group = $(this).children('NAME').text();
            var attrs = $(this).children('FIELD');
            attrs.each(function () {
              var tmpAttr = {
                tag: $(this).find('LABEL').text(),
                description: $(this).children('DESCRIPTION').text().replace(/\s+/g, ' '),
                group: group,
                mandatory: $(this).find('MANDATORY').text()
              };
              // Special case for EGA default checklist
              // add description for the phenotype attribute
              if (acc === 'ERC000026' && tmpAttr.tag === 'phenotype') {
                // jscs:disable maximumLineLength
                tmpAttr.description = 'Where possible, use the Experimental Factor Ontology (EFO; http://www.ebi.ac.uk/efo/) to describe your phenotypes. Add the EFO accession in the Unit field (e.g. EFO:0000182). Add more than one phenotype attribute if needed';
                // jscs:enable maximumLineLength
              }

              // get value type for attribute
              if ($(this).find('TEXT_FIELD').length > 0) {
                tmpAttr.val_type = 'TEXT_FIELD';
              } else if ($(this).find('TEXT_CHOICE_FIELD').length > 0) {
                tmpAttr.val_type = 'TEXT_CHOICE_FIELD';
                var choice = $(this).find('TEXT_CHOICE_FIELD');
                var vals = choice.find('VALUE');
                tmpAttr.text_choices = [];
                vals.each(function () {
                  var ch = $(this).text();
                  tmpAttr.text_choices.push(ch);
                });
              } else if ($(this).find('REGEX_VALUE').length > 0) {
                tmpAttr.val_type = 'REGEX_VALUE';
                tmpAttr.regexp = $(this).find('REGEX_VALUE').text();
              }

              // get units (if any)
              var units = $(this).find('UNIT');
              if (units.length > 0) {
                tmpAttr.units = [];
                units.each(function () {
                  var u = $(this).text();
                  tmpAttr.units.push(u);
                });
              }
              tmpCl.attributes.push(tmpAttr);
            });
          });
          self.checklist[acc] = tmpCl;
        });
        // console.log(self.checklist);
      });
    }

    // cross domain problems as usual - trying using a php proxy solution...
    self.getTaxonData = function (sample) {
      var url = 'taxon_proxy.php?id=' + sample.taxonID.value;

      if (typeof sample.taxonID.value !== 'number') { return; }
      $http.get(url).then(function (response) {
        sample.sci_name.value = response.data.scientificName;
        sample.common_name.value = response.data.commonName;
      });
    };

    self.addNewAttribute = function (sample) {
      sample.attributes.push({tag: '', value: ''});
    };

    self.removeAttribute = function (sample, attribute) {
      var attr_index = sample.attributes.indexOf(attribute);
      if (attr_index !== -1) {
        sample.attributes.splice(attr_index, 1);
      }
      // var lastItem = sample.attributes.length-1;
      // sample.attributes.splice(lastItem);
    };

    self.loadChecklist = function (sample) {
      sample.attributes = sample.selected_checklist.attributes;
    };

    self.filterEmptyAttributes = function (element) {
      return element.value;
    };

    self.addNewSample = function () { // should refactor this to one sample creating function
      var tmp = {
        centerName: {
          label: 'Center name',
          description: 'The name of your institution as specified in your ENA user account',
          value: self.common.centerName.value,
          placeholder: ''
        },
        name: {
          label: 'Sample name',
          description: 'A unique name for the sample',
          value: self.common.name.value,
          placeholder: 'Sample001'
        },
        title: {
          label: 'Title',
          description: 'A short informative description of the sample',
          value: self.common.title.value,
          placeholder: 'Sample001'
        },
        taxonID: {
          label: 'Organism Taxon ID',
          description: 'Provide NCBI taxon_id for organism (e.g. 9606 for human)',
          value: self.common.taxonID.value,
          placeholder: '9606'
        },
        sci_name: {
          label: 'Organism scientific name',
          description: 'Scientific name as appears in NCBI taxonomy for the taxon_id (e.g. homo sapiens)',
          value: self.common.sci_name.value,
          placeholder: 'homo sapiens'
        },
        common_name: {
          label: 'Organism common name - optional',
          description: 'The common name for the organism (e.g. human)',
          value: self.common.common_name.value,
          placeholder: 'human'
        },
        description: {
          label: 'Description - optional',
          description: 'A longer description of sample and how it differs from other samples',
          value: self.common.description.value,
          placeholder: 'Sample from ...'
        },
        attributes: []
      };

      // Add attributes
      for (var i = 0; i < self.common.attributes.length; i++) {
        var newAttr = {};
        for (var k in self.common.attributes[i]) {
          if (self.common.attributes[i].hasOwnProperty(k)) {
            newAttr[k] = self.common.attributes[i][k];
          }
        }
        tmp.attributes.push(newAttr);
      }

      self.list.push(tmp);

    };

    self.saveXML = function () {
      // angular has added a child with the same id, so getting the first child
      var pre_element = $('#pre-samples-xml')[0];
      var xml_text = pre_element.textContent || pre_element.innerText;
      var blob = new Blob([xml_text], {type: 'text/xml;charset=utf-8'});
      saveAs(blob, 'sample.xml');
    };

    self.parseXML = function () {
      var input = $('#uploadSampleInput')[0].files[0];
      var reader = new FileReader();
      var content;

      reader.onload = function (e) {
        var content = reader.result;

        var xmlDoc = $.parseXML(content); // using jquery to parse the xml string
        var $xml = $(xmlDoc);

        $scope.$apply(function () { // to update bindings

          var samples = $xml.find('SAMPLE');
          samples.each(function () {
            // var newSample = {};
            var attr_nodes = $(this).find('SAMPLE_ATTRIBUTE');
            var attrs = [];
            attr_nodes.each(function () {
              attrs.push({
                tag: $(this).find('TAG').text(),
                value: $(this).find('VALUE').text(),
                unit: $(this).find('UNIT').text()
              });
            });

            var newSample = self.createSample (
              $(this).attr('center_name'), // centerName
              $(this).attr('alias'),  // name
              $(this).find('TITLE').text(), // title
              $(this).find('TAXON_ID').text(), // taxon ID
              $(this).find('SCIENTIFIC_NAME').text(), // sci_name
              $(this).find('COMMON_NAME').text(), // common_name
              $(this).find('DESCRIPTION').text(), // description
              attrs // attributes
            );

            self.list.push(newSample);
            self.checkUnique(newSample); // make effort to find common data between samples
          });
        });
      };

      reader.readAsText(input, 'UTF-8');

    };

    // To check and set unique values in the common sample info object
    // Only removes non-unique values.
    // NB! Does not check that all samples have these values
    self.checkUnique = function (sample) {
      for (var field in sample) {
        if (field !== 'attributes') {
          if (self.common[field].unique === undefined) {
            self.common[field].unique = true;
            self.common[field].value = sample[field].value;
          } else if (self.common[field].unique && self.common[field].value !== sample[field].value) {
            self.common[field].unique = false;
            self.common[field].value = '';
          }
        }
      }

      // Now the attributes
      for (var i = 0; i < sample.attributes.length; i++) {

        if (self.common.attributes[0].tag === '') { self.common.attributes = []; }

        var curr_attr = sample.attributes[i];
        // if tags are equal cmp_attr will be set to the existing common attribute
        // otherwise to false
        var cmp_attr = self.isInCommonAttributes(curr_attr);
        if (cmp_attr) { // there is already a common attribute with this tag
          if (cmp_attr.unique === undefined) {
            if (cmp_attr.value === curr_attr.value) {
              cmp_attr.unique = true;
              if (cmp_attr.value === undefined) { cmp_attr.value = curr_attr.value; }
            } else {
              cmp_attr.unique = false;
            }
          } else if (cmp_attr.unique && cmp_attr.value !==  curr_attr.value) {
            cmp_attr.unique = false;
            cmp_attr.value = '';
          }
        } else {
          var new_attr = {
            tag: curr_attr.tag,
            value: curr_attr.value,
            unit: curr_attr.unit,
            unique: true
          };
          self.common.attributes.push(new_attr);
        }
      }
    };

    // To find if an attribute is present in the common attributes list
    // Assumes that it is only legal to have one attribute with the same tag
    self.isInCommonAttributes = function (attr) {
      for (var i = 0; i < self.common.attributes.length; i++) {
        if (self.common.attributes[i].tag === attr.tag) { return self.common.attributes[i]; }
      }
      return false;
    };

    self.createSample = function (center, n, tit, taxID, scin, commonn, descr, attr) {
      return {
        centerName: {
          label: 'Center name',
          description: 'The name of your institution as specified in your ENA user account',
          value: center,
          placeholder: ''
        },
        name: {
          label: 'Sample name',
          description: 'A unique name for the sample',
          value: n,
          placeholder: 'Sample001'
        },
        title: {
          label: 'Title',
          description: 'A short informative description of the sample',
          value: tit,
          placeholder: 'Sample001'
        },
        taxonID: {
          label: 'Organism Taxon ID',
          description: 'Provide NCBI taxon_id for organism (e.g. 9606 for human)',
          value: parseInt(taxID, 10),
          placeholder: '9606'
        },
        sci_name: {
          label: 'Organism scientific name',
          description: 'Scientific name as appears in NCBI taxonomy for the taxon_id (e.g. homo sapiens)',
          value: scin,
          placeholder: 'homo sapiens'
        },
        common_name: {
          label: 'Organism common name - optional',
          description: 'The common name for the organism (e.g. human)',
          value: commonn,
          placeholder: 'human'
        },
        description: {
          label: 'Description - optional',
          description: 'A longer description of sample and how it differs from other samples',
          value: descr,
          placeholder: 'Sample from ...'
        },
        attributes: attr
      };
    };

  }]); // app.controller - SamplesController

  /* ------------------------------------------
   *   AnalysisController
   * ------------------------------------------ */
  app.controller('AnalysisController', ['$scope',function ($scope)  {
    // passing in $scope to be able to call $scope.apply() in parseXML() to update data bindings
    // this.items = studyItems;
    var self = this;
    self.centerName = {
      label: 'Center name',
      description: 'The name of your institution as specified in your ENA user account',
      value: '',
      placeholder: ''
    };

    self.shortName = {
      label: 'Short name',
      description: 'A short unique descriptive name for the assembly',
      value: ''
    };

    self.title = {
      label: 'Title',
      description: 'A short title of the assembly',
      value: ''
    };

    self.description = {
      label: 'Description',
      description: 'A short description of the assembly',
      value: ''
    };

    self.studyReferenceName = {
      label: 'Study reference name',
      description: 'The unique short name of the study',
      value: ''
    };

    self.studyReferenceCenterName = {
      label: 'Study reference Center name',
      description: 'The name of the institution used when submitting the Study',
      value: ''
    };

    self.sampleReferenceName = {
      label: 'Sample reference name',
      description: 'The unique short name of the sample',
      value: ''
    };

    self.sampleReferenceCenterName = {
      label: 'Sample reference Center name',
      description: 'The name of the institution used when submitting the Sample',
      value: ''
    };

    self.partial = {
      label: 'Partial',
      description: 'If the assembly is partial or not',
      options: [
        'true',
        'false'
      ],
      value: ''
    };

    self.coverage = {
      label: 'Coverage',
      description: 'Numeric sequencing coverage',
      value: ''
    };

    self.program = {
      label: 'Assembly program',
      description: 'Program used to generate the assembly and version',
      value: ''
    };

    self.platform = {
      label: 'Sequencing platform',
      description: 'Sequencing platform used to generate the sequencing data, e.g. Illumina',
      value: ''
    };

    self.assemblyFileName = {
      label: 'Assembly file name',
      description: 'Name of the assembly file. Should be a compressed file',
      value: ''
    };

    self.assemblyFileType = {
      label: 'Assembly file type',
      description: 'For an embl formated file, choose a flatfile format',
      options: [
        'flatfile',
        'fasta',
        'agp',
        'chromosome_list',
        'unlocalised_list'
      ],
      value: ''
    };

    self.assemblyFileChecksum = {
      label: 'Assembly file MD5 checksum',
      description: 'MD5 checksum of the assembly file',
      value: ''
    };

    self.analysisAttributes = [
      {tag: '', value: ''}
    ];

    self.addNewAttribute = function () {
      self.analysisAttributes.push({tag: '', value: ''});
    };

    self.removeAttribute = function () {
      var lastItem = self.analysisAttributes.length - 1;
      self.analysisAttributes.splice(lastItem);
    };

    self.noAttributes = function () {
      return;
    };

    self.saveXML = function () {
      // angular has added a child with the same id, so getting the first child
      var pre_element = $('#pre-analysis-xml')[0];
      var xml_text = pre_element.textContent || pre_element.innerText;
      var blob = new Blob([xml_text], {type: 'text/xml;charset=utf-8'});
      saveAs(blob, 'analysis.xml');
    };

    self.parseXML = function () {

      var input = $('#uploadAnalysisInput')[0].files[0];
      var reader = new FileReader();
      var content;

      reader.onload = function (e) {
        var content = reader.result;

        var xmlDoc = $.parseXML(content); // using jquery to parse the xml string
        var $xml = $(xmlDoc);

        $scope.$apply(function () { // to update bindings
          self.centerName.value = $xml.find('ANALYSIS').attr('center_name');
          self.shortName.value = $xml.find('ANALYSIS').attr('alias');
          self.title.value = $xml.find('TITLE').text();
          self.description.value = $xml.find('DESCRIPTION').text();
          self.studyReferenceName.value = $xml.find('STUDY_REF').attr('refname');
          self.studyReferenceCenterName.value = $xml.find('STUDY_REF').attr('refcenter');
          self.sampleReferenceName.value = $xml.find('SAMPLE_REF').attr('refname');
          self.sampleReferenceCenterName.value = $xml.find('SAMPLE_REF').attr('refcenter');
          self.partial.value = $xml.find('PARTIAL').text();
          self.coverage.value = parseInt($xml.find('COVERAGE').text(), 10); // Has to be a numeric value
          self.program.value = $xml.find('PROGRAM').text();
          self.platform.value = $xml.find('PLATFORM').text();

          self.assemblyFileName.value = $xml.find('FILE').attr('filename');
          self.assemblyFileType.value = $xml.find('FILE').attr('filetype');
          self.assemblyFileChecksum.value = $xml.find('FILE').attr('checksum');

          self.analysisAttributes = [];
          var attributes = $xml.find('ANALYSIS_ATTRIBUTES');
          attributes.each(function () {
            self.analysisAttributes.push(
              {
                tag: $(this).find('TAG').text(),
                value: $(this).find('VALUE').text()
              });
          });
          if (self.analysisAttributes.length === 0){
            self.analysisAttributes = [
              {tag: '', value: ''}
            ];
          }
        });
      };

      reader.readAsText(input, 'UTF-8');

    };

  }]); // app.controller - AnalysisController

  app.directive('studyXml', function () {
    return {
      restrict: 'E',
      templateUrl: 'study-xml.html'
    };
  });

  app.directive('samplesXml', function () {
    return {
      restrict: 'E',
      templateUrl: 'samples-xml.html'
    };
  });

  app.directive('analysisXml', function () {
    return {
      restrict: 'E',
      templateUrl: 'analysis-xml.html'
    };
  });

})();
