export interface HighShaderBit {
  name: string;
  vertex?: {
    header?: string;
    main?: string;
    start?: string;
    end?: string;
  };
  fragment?: {
    header?: string;
    main?: string;
    start?: string;
    end?: string;
  };
}
